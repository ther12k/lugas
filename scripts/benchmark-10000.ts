/**
 * 10,000-route stress closure (M5-014).
 *
 * Measures composition time, manifest generation cost, and memory usage
 * for a 10,000-route Lugas application.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const RESULTS_DIR = resolve(ROOT, "benchmarks", "results", "m5-10000");
const COUNT = Number(process.env.ROUTE_COUNT ?? 10_000);

async function main() {
  console.log(`[m5-10000] starting with ${COUNT} routes`);
  mkdirSync(RESULTS_DIR, { recursive: true });

  const { defineApp } = require(resolve(ROOT, "src/core/app")) as typeof import("../src/core/app");
  const { route } = require(resolve(ROOT, "src/core/route")) as typeof import("../src/core/route");

  const methods = ["GET", "POST", "PUT", "DELETE"] as const;
  const routes: Record<string, unknown> = {};
  for (let i = 0; i < COUNT; i++) {
    const method = methods[i % methods.length]!;
    routes[`/route-${i}`] = { [method]: route({ handler: () => new Response(JSON.stringify({ id: i }), { headers: { "content-type": "application/json" } }) }) };
  }

  console.log(`composing ${COUNT} routes...`);
  const t0 = performance.now();
  const app = defineApp({ routes });
  const composeMs = Math.round(performance.now() - t0);
  console.log(`compose: ${composeMs}ms`);

  console.log("serializing manifest...");
  const t1 = performance.now();
  const manifestJson = JSON.stringify(app.manifest);
  const manifestMs = Math.round(performance.now() - t1);
  const manifestRoutes = app.manifest.routes.length;
  console.log(`manifest: ${manifestMs}ms, routes: ${manifestRoutes}`);

  const mem = process.memoryUsage();
  const rssMb = Math.round(mem.rss / 1024 / 1024);
  const heapMb = Math.round(mem.heapUsed / 1024 / 1024);
  console.log(`rss: ${rssMb}MB, heapUsed: ${heapMb}MB`);

  const results = {
    count: COUNT,
    composeMs,
    manifestMs,
    manifestRoutes,
    rssMb,
    heapMb,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(resolve(RESULTS_DIR, "results.json"), JSON.stringify(results, null, 2));
  console.log(`\nResults written to ${RESULTS_DIR}/results.json`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[m5-10000] FAILED:", err?.message ?? err);
  process.exit(1);
});
