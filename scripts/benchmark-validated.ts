/**
 * Validated route overhead measurement (M5-003).
 *
 * Compares raw Bun vs Lugas for a validated/authenticated POST route
 * across 5 independent runs. Reports median rps and p99 latency.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const RESULTS_DIR = resolve(ROOT, "benchmarks", "results", "m5-validated");
const RUNS = 5;
const DURATION_MS = Number(process.env.BENCH_DURATION_MS ?? 2_000);
const CONCURRENCY = 8;

type Sample = { rps: number; p50us: number; p95us: number; p99us: number; total: number };

async function measure(url: string): Promise<Sample> {
  const deadline = Date.now() + DURATION_MS;
  const latencies: number[] = [];
  let total = 0;
  const body = JSON.stringify({ name: "Ada", email: "ada@example.com" });

  let firstError: Error | undefined;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (Date.now() < deadline) {
      const start = performance.now();
      const res = await fetch(new URL("/api/users", url), {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer t" },
        body,
      });
      // M6R2 #281: only contract-satisfying responses count as throughput.
      if (res.status !== 201) {
        firstError ??= new Error(`contract violated: status ${res.status} != 201`);
        break;
      }
      const text = await res.text();
      if (!text.includes("\"ok\":true")) {
        firstError ??= new Error("contract violated: body missing ok:true");
        break;
      }
      latencies.push(Math.round((performance.now() - start) * 1000));
      total++;
    }
  });
  await Promise.all(workers);
  if (firstError !== undefined) {
    throw new Error(`validated benchmark: ${firstError.message}`);
  }

  latencies.sort((a, b) => a - b);
  const pct = (p: number) => latencies[Math.min(Math.ceil((p / 100) * latencies.length) - 1, latencies.length - 1)] ?? 0;
  return { rps: Math.round(total / (DURATION_MS / 1000)), p50us: pct(50), p95us: pct(95), p99us: pct(99), total };
}

function median(v: number[]): number {
  if (v.length === 0) return 0;
  return [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]!;
}

async function main() {
  mkdirSync(RESULTS_DIR, { recursive: true });

  // Raw Bun
  const { createRawValidated } = await import(resolve(ROOT, "benchmarks/raw-bun/validated/scenarios.ts"));
  const rawSamples: Sample[] = [];
  for (let i = 0; i < RUNS; i++) {
    const server = createRawValidated();
    try {
      const s = await measure(server.url.origin);
      rawSamples.push(s);
      console.log(`raw-bun run=${i + 1}: ${s.rps} rps, p99=${s.p99us}µs`);
    } finally { server.stop(true); }
  }

  // Lugas
  const { createLugasValidated } = await import(resolve(ROOT, "benchmarks/lugas/validated/scenarios.ts"));
  const lugasSamples: Sample[] = [];
  for (let i = 0; i < RUNS; i++) {
    const app = createLugasValidated();
    const server = app.serve({ port: 0, development: false });
    try {
      const s = await measure(server.url.origin);
      lugasSamples.push(s);
      console.log(`lugas run=${i + 1}: ${s.rps} rps, p99=${s.p99us}µs`);
    } finally { server.stop(true); }
  }

  // Summary
  const rawRps = median(rawSamples.map(s => s.rps));
  const lgRps = median(lugasSamples.map(s => s.rps));
  const overheadPct = rawRps > 0 ? (((rawRps - lgRps) / rawRps) * 100).toFixed(1) : "?";

  console.log(`\n## Summary (median of ${RUNS} runs)\n`);
  console.log("| framework | median rps | median p99 µs |");
  console.log("|---|---|---|");
  console.log(`| raw-bun | ${rawRps} | ${median(rawSamples.map(s => s.p99us))} |`);
  console.log(`| lugas | ${lgRps} | ${median(lugasSamples.map(s => s.p99us))} | — overhead: ${overheadPct}% |`);

  // M6R2 #280: archive binds to candidate commit so the release gate can reject stale evidence.
  const env = { bunVersion: Bun.version, commit: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(), timestamp: new Date().toISOString() };
  // Archive — skipped under LUGAS_BENCH_NO_ARCHIVE (short smoke runs).
  if (process.env.LUGAS_BENCH_NO_ARCHIVE === "1") {
    console.log(`\n(archive skipped: LUGAS_BENCH_NO_ARCHIVE=1)`);
    return;
  }
  writeFileSync(resolve(RESULTS_DIR, "results.json"), JSON.stringify({ env, raw: rawSamples, lugas: lugasSamples }, null, 2));
  console.log(`\nArchived to ${RESULTS_DIR}/results.json`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
