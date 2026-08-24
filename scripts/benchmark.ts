/**
 * Controlled benchmark entry point (M5-001).
 *
 * Usage:
 *   bun run scripts/benchmark.ts --smoke    # 1 run, short duration (CI)
 *   bun run scripts/benchmark.ts            # full: 3 runs, standard duration
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_CONFIG, runScenario } from "../benchmarks/harness/runner";
import type { HarnessConfig } from "../benchmarks/harness/runner";

const ROOT = resolve(import.meta.dir, "..");
const RESULTS_DIR = resolve(ROOT, "benchmarks", "results");

const smoke = process.argv.includes("--smoke");

const config: HarnessConfig = smoke
  ? { warmupMs: 200, durationMs: 500, concurrency: 4, runs: 1 }
  : DEFAULT_CONFIG;

// Define scenarios inline to avoid importing framework internals.
const scenarios: Array<{
  name: string;
  createServer: () => { url: string; stop: () => void };
  path: string;
  status: number;
}> = [
  {
    name: "lugas-static",
    createServer: () => {
      const app = require(resolve(ROOT, "src/core/app")).defineApp({
        routes: { "/bench": { GET: new Response("static") } },
      });
      const server = app.serve({ port: 0, development: false });
      return { url: server.url, stop: () => server.stop(true) };
    },
    path: "/bench",
    status: 200,
  },
  {
    name: "lugas-json",
    createServer: () => {
      const { defineApp } = require(resolve(ROOT, "src/core/app"));
      const { route } = require(resolve(ROOT, "src/core/route"));
      const app = defineApp({
        routes: {
          "/bench": {
            GET: route({ handler: () => new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } }) }),
          },
        },
      });
      const server = app.serve({ port: 0, development: false });
      return { url: server.url, stop: () => server.stop(true) };
    },
    path: "/bench",
    status: 200,
  },
];


async function main() {
  mkdirSync(RESULTS_DIR, { recursive: true });

  const envInfo = {
    bunVersion: Bun.version,
    platform: process.platform,
    arch: process.arch,
    cpuModel: (() => {
      try {
        const lscpu = execSync("lscpu | grep 'Model name' | head -1", { encoding: "utf8" });
        return lscpu.split(":").pop()?.trim() ?? "unknown";
      } catch { return "unknown"; }
    })(),
    memoryTotalMb: (() => {
      try {
        const meminfo = require("node:fs").readFileSync("/proc/meminfo", "utf8");
        return Math.round(Number.parseInt(meminfo.match(/MemTotal:\s+(\d+)/)![1]!, 10) / 1024);
      } catch { return 0; }
    })(),
    commit: execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(),
  };

  console.log(`Benchmark (${smoke ? "SMOKE" : "FULL"}) — bun ${envInfo.bunVersion}, ${envInfo.cpuModel}\n`);

  const allResults: object[] = [];

  for (const scenario of scenarios) {
    for (let run = 0; run < config.runs; run++) {
      const result = await runScenario(scenario.name, scenario.createServer, scenario.path, scenario.status, config);
      // Enrich metadata with environment
      Object.assign(result.metadata, envInfo);
      allResults.push(result);

      const sample = result.samples[0]!;
      console.log(
        `  ${scenario.name} run=${run + 1}: ${sample.requestsPerSecond} rps, p50=${sample.p50LatencyUs}µs, p99=${sample.p99LatencyUs}µs`,
      );

      // Retain raw data per run
      const rawFile = resolve(RESULTS_DIR, `${scenario.name}-run${run + 1}.json`);
      writeFileSync(rawFile, JSON.stringify(result, null, 2));
    }
  }

  const summaryPath = resolve(RESULTS_DIR, smoke ? "smoke-summary.json" : "full-summary.json");
  writeFileSync(summaryPath, JSON.stringify(allResults, null, 2));
  console.log(`\nResults written to ${RESULTS_DIR}/`);
}

main().catch(console.error);
