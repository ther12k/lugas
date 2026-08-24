/**
 * Route-count startup and memory benchmark (M5-004).
 *
 * Measures in-process route composition + manifest build cost and
 * post-composition memory usage at various route counts.
 *
 * Usage: bun run scripts/benchmark-route-count.ts [--smoke]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const RESULTS_DIR = resolve(ROOT, "benchmarks", "results", "m5-route-count");
const smoke = process.argv.includes("--smoke");
const counts = smoke ? [100] : [100, 1000];
const runs = smoke ? 1 : 3;

function generateRoutes(count: number): Record<string, unknown> {
  const routes: Record<string, unknown> = {};
  const { route } = require(resolve(ROOT, "src/core/route")) as typeof import("../src/core/route");
  const methods = ["GET", "POST", "PUT", "DELETE"];
  for (let i = 0; i < count; i++) {
    const method = methods[i % methods.length]!;
    routes[`/route-${i}`] = { [method]: route({ handler: () => new Response(JSON.stringify({ id: i }), { headers: { "content-type": "application/json" } }) }) };
  }
  return routes;
}

async function main() {
  mkdirSync(RESULTS_DIR, { recursive: true });

  const { defineApp } = await import(resolve(ROOT, "src/core/app"));
  const results: Array<{ count: number; run: number; composeMs: number; manifestMs: number; rssMb: number; heapUsedMb: number; routesInManifest: number }> = [];

  for (const count of counts) {
    for (let run = 1; run <= runs; run++) {
      // Force GC between runs if available
      if (globalThis.gc) globalThis.gc();

      const t0 = performance.now();
      const routes = generateRoutes(count);
      const app = defineApp({ routes } as never);
      const composeMs = Math.round(performance.now() - t0);

      const t1 = performance.now();
      const manifestJson = JSON.stringify(app.manifest);
      const manifestMs = Math.round(performance.now() - t1);

      const mem = process.memoryUsage();
      const entry = {
        count,
        run,
        composeMs,
        manifestMs,
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        routesInManifest: app.manifest.routes.length,
      };
      results.push(entry);
      console.log(`  ${count} routes run=${run}: compose=${composeMs}ms, manifest=${manifestMs}ms, rss=${entry.rssMb}MB, heap=${entry.heapUsedMb}MB, routes=${entry.routesInManifest}`);
    }
  }

  writeFileSync(resolve(RESULTS_DIR, smoke ? "smoke.json" : "results.json"), JSON.stringify(results, null, 2));
  console.log(`\nResults written to ${RESULTS_DIR}/`);
}

main().catch(console.error);
