/**
 * Plain-route overhead measurement (M5-002).
 *
 * Compares raw Bun vs Lugas for static, sync JSON, async JSON, and params
 * routes. Reports median/p95/p99 across 5 runs.
 *
 * Usage: bun run scripts/benchmark-plain.ts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { loadavg } from "node:os";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const RESULTS_DIR = resolve(ROOT, "benchmarks", "results", "m5-plain");
const RUNS = 5;
const DURATION_MS = Number(process.env.BENCH_DURATION_MS ?? 2_000);
const CONCURRENCY = 8;

type Sample = { rps: number; p50us: number; p95us: number; p99us: number; total: number };
type ScenarioResult = { scenario: string; framework: string; samples: Sample[] };

/** One benchmark contract: expected status + body marker for a scenario. */
export type Expectation = { status: number; bodyIncludes?: string };

/**
 * Asserts one exchange against the scenario contract (M6R2 #281). A fast 404
 * or 500 must never register as throughput; the first violation aborts
 * evidence generation entirely.
 */
export async function assertContract(res: Response, expected: Expectation): Promise<void> {
  if (res.status !== expected.status) {
    throw new Error(`benchmark contract violated: status ${res.status} != ${expected.status}`);
  }
  if (expected.bodyIncludes !== undefined) {
    const text = await res.text();
    if (!text.includes(expected.bodyIncludes)) {
      throw new Error(`benchmark contract violated: body missing '${expected.bodyIncludes}'`);
    }
  }
}

async function measure(
  label: string,
  createServer: () => { url: string; stop: () => void },
  path: string,
  expected: Expectation,
): Promise<Sample> {
  const { url, stop } = createServer();
  try {
    // Warmup — contract-asserted like every measured request.
    await assertContract(await fetch(new URL(path, url)), expected);
    const deadline = Date.now() + DURATION_MS;
    const latencies: number[] = [];
    let total = 0;
    let firstError: Error | undefined;

    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (Date.now() < deadline) {
        const start = performance.now();
        try {
          const res = await fetch(new URL(path, url));
          await assertContract(res, expected);
        } catch (error) {
          firstError ??= error as Error;
          break; // stop generating evidence on first violation
        }
        latencies.push(Math.round((performance.now() - start) * 1000));
        total++;
      }
    });
    await Promise.all(workers);
    if (firstError !== undefined) {
      throw new Error(`${label}: ${firstError.message}`);
    }

    latencies.sort((a, b) => a - b);
    const pct = (p: number) => latencies[Math.min(Math.ceil((p / 100) * latencies.length) - 1, latencies.length - 1)] ?? 0;
    return {
      rps: Math.round(total / (DURATION_MS / 1000)),
      p50us: pct(50),
      p95us: pct(95),
      p99us: pct(99),
      total,
    };
  } finally {
    stop();
  }
}

function rawBunStatic() {
  const server = Bun.serve({ port: 0, fetch: () => new Response("static") });
  return { url: server.url.origin, stop: () => server.stop(true) };
}

function rawBunJson() {
  const server = Bun.serve({
    port: 0,
    fetch: () => new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } }),
  });
  return { url: server.url.origin, stop: () => server.stop(true) };
}

function lugasApp() {
  // Dynamic import to avoid circular issues
  const { defineApp } = require(resolve(ROOT, "src/core/app")) as typeof import("../src/core/app");
  const { route } = require(resolve(ROOT, "src/core/route")) as typeof import("../src/core/route");
  const app = defineApp({
    routes: {
      "/static": { GET: new Response("static") },
      "/json": {
        GET: route({
          handler: () => new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } }),
        }),
      },
      "/async": {
        GET: route({
          handler: async () => new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } }),
        }),
      },
      "/params/:id": {
        GET: route({
          handler: ({ params }: { params: Record<string, string> }) =>
            new Response(JSON.stringify({ id: params.id }), { headers: { "content-type": "application/json" } }),
        }),
      },
    },
  });
  const server = app.serve({ port: 0, development: false });
  return { url: server.url.origin, stop: () => server.stop(true) };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}
function pct(v: number[], p: number): number {
  if (v.length === 0) return 0;
  const sorted = [...v].sort((a, b) => a - b);
  return sorted[Math.min(Math.ceil((p / 100) * sorted.length) - 1, sorted.length - 1)] ?? 0;
}

async function main() {
  mkdirSync(RESULTS_DIR, { recursive: true });
  // M6R6.1 #311: the archive records the machine it measured on (platform,
  // arch, CPU, load before/after) so the release gate can enforce the
  // platform/arch binding its contract claims and auditors can see host
  // conditions instead of trusting a narrative "quiet host" statement.
  const loadAverageBefore = loadavg();
  const env = {
    bunVersion: Bun.version,
    cpuModel: (() => { try { return execSync("lscpu | grep 'Model name' | head -1", { encoding: "utf8" }).split(":").pop()?.trim() ?? ""; } catch { return ""; } })(),
    commit: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
    platform: process.platform,
    arch: process.arch,
    loadAverageBefore: [...loadAverageBefore],
    loadAverageAfter: [] as number[],
    timestamp: new Date().toISOString(),
  };

  console.log(`Plain-route overhead benchmark (${RUNS} runs × ${DURATION_MS}ms)\n`);

  const results: ScenarioResult[] = [];

  // Raw Bun static
  const rawStaticSamples: Sample[] = [];
  for (let i = 0; i < RUNS; i++) {
    const s = await measure(`raw-static`, rawBunStatic, "/static", { status: 200, bodyIncludes: "static" });
    rawStaticSamples.push(s);
    console.log(`raw-bun /static run=${i + 1}: ${s.rps} rps`);
  }
  results.push({ scenario: "plain-static", framework: "raw-bun", samples: rawStaticSamples });

  // Lugas static
  const lugasStaticSamples: Sample[] = [];
  for (let i = 0; i < RUNS; i++) {
    const s = await measure(`lugas-static`, lugasApp, "/static", { status: 200, bodyIncludes: "static" });
    lugasStaticSamples.push(s);
    console.log(`lugas /static run=${i + 1}: ${s.rps} rps`);
  }
  results.push({ scenario: "plain-static", framework: "lugas", samples: lugasStaticSamples });

  // Raw Bun JSON
  const rawJsonSamples: Sample[] = [];
  for (let i = 0; i < RUNS; i++) {
    const s = await measure(`raw-json`, rawBunJson, "/json", { status: 200, bodyIncludes: "ok" });
    rawJsonSamples.push(s);
    console.log(`raw-bun /json run=${i + 1}: ${s.rps} rps`);
  }
  results.push({ scenario: "plain-json", framework: "raw-bun", samples: rawJsonSamples });

  // Lugas JSON
  const lugasJsonSamples: Sample[] = [];
  for (let i = 0; i < RUNS; i++) {
    const s = await measure(`lugas-json`, lugasApp, "/json", { status: 200, bodyIncludes: "ok" });
    lugasJsonSamples.push(s);
    console.log(`lugas /json run=${i + 1}: ${s.rps} rps`);
  }
  results.push({ scenario: "plain-json", framework: "lugas", samples: lugasJsonSamples });

  // Summary table
  console.log("\n## Summary (median of " + RUNS + " runs)\n");
  console.log("| scenario | framework | median rps | median p50 µs | median p99 µs |");
  console.log("|---|---|---|---|---|");

  for (const [scenarioId, path] of [["plain-static", "/static"], ["plain-json", "/json"]] as const) {
    const raw = results.find((r) => r.scenario === scenarioId && r.framework === "raw-bun");
    const lg = results.find((r) => r.scenario === scenarioId && r.framework === "lugas");
    if (!raw || !lg) continue;
    const rawRps = median(raw.samples.map((s) => s.rps));
    const lgRps = median(lg.samples.map((s) => s.rps));
    const overheadPct = rawRps > 0 ? (((rawRps - lgRps) / rawRps) * 100).toFixed(1) : "?";
    console.log(
      `| ${scenarioId} | raw-bun | ${rawRps} | ${median(raw.samples.map((s) => s.p50us))} | ${median(raw.samples.map((s) => s.p99us))} |`,
    );
    console.log(
      `| ${scenarioId} | lugas | ${lgRps} | ${median(lg.samples.map((s) => s.p50us))} | ${median(lg.samples.map((s) => s.p99us))} | — overhead: ${overheadPct}% |`,
    );
  }

  // Archive — skipped under LUGAS_BENCH_NO_ARCHIVE (short smoke runs from the
  // benchmark-validity test suite); short-run data would otherwise poison the
  // perf gate with slow, non-representative samples (#M6-009 follow-up).
  if (process.env.LUGAS_BENCH_NO_ARCHIVE === "1") {
    console.log(`\n(archive skipped: LUGAS_BENCH_NO_ARCHIVE=1)`);
    return;
  }
  env.loadAverageAfter = [...loadavg()];
  writeFileSync(resolve(RESULTS_DIR, "results.json"), JSON.stringify({ env, results }, null, 2));
  console.log(`\nRaw data archived to ${RESULTS_DIR}/results.json`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
