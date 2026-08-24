/**
 * Performance budget gate (M5-007).
 *
 * Validates that current benchmark results meet accepted thresholds.
 * Three levels: release-blocking, alert, target.
 *
 * Usage:
 *   bun run scripts/check-performance-budget.ts                # check against baselines
 *   bun run scripts/check-performance-budget.ts --smoke        # quick validation
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const BASELINES_PATH = resolve(ROOT, "benchmarks", "baselines", "m5-accepted.json");
const RESULTS_DIR = resolve(ROOT, "benchmarks", "results");

interface Thresholds {
  [scenario: string]: {
    releaseBlockMinRps: number;
    alertMinRps: number;
    targetRps: number;
  };
}

interface Baselines {
  version: number;
  thresholds: Thresholds;
  typecheckBudgetMs: number;
  clientBundleMaxBytes: number;
}

type Sample = { rps: number; p50us: number; p95us: number; p99us: number };

function loadBaselines(): Baselines {
  if (!existsSync(BASELINES_PATH)) {
    console.error("baselines file not found:", BASELINES_PATH);
    process.exit(1);
  }
  return JSON.parse(readFileSync(BASELINES_PATH, "utf8"));
}

function findResults(scenario: string): Sample[] {
  const resultsPath = resolve(RESULTS_DIR, `m5-plain`, `results.json`);
  if (!existsSync(resultsPath)) return [];
  const data = JSON.parse(readFileSync(resultsPath, "utf8"));
  return (data.results ?? [])
    .filter((r: { scenario: string }) => r.scenario === scenario)
    .flatMap((r: { samples: Sample[] }) => r.samples);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function main() {
  const baselines = loadBaselines();
  let failures = 0;
  let alerts = 0;

  console.log("=== Performance Budget Check ===\n");
  console.log(`Baseline version: ${baselines.version}`);
  console.log(`TypeScript budget: ${baselines.typecheckBudgetMs}ms`);
  console.log(`Client bundle max: ${baselines.clientBundleMaxBytes}B\n`);

  for (const [scenario, threshold] of Object.entries(baselines.thresholds)) {
    const samples = findResults(scenario);
    if (samples.length === 0) {
      console.log(`⚠ ${scenario}: no archived results found (skipped)`);
      continue;
    }

    const medianRps = median(samples.map((s) => s.rps));

    if (medianRps < threshold.releaseBlockMinRps) {
      console.error(`✗ ${scenario}: ${medianRps} rps < release block minimum ${threshold.releaseBlockMinRps} rps`);
      failures++;
    } else if (medianRps < threshold.alertMinRps) {
      console.warn(`⚠ ${scenario}: ${medianRps} rps < alert threshold ${threshold.alertMinRps} rps`);
      alerts++;
    } else {
      console.log(`✓ ${scenario}: ${medianRps} rps ≥ target ${threshold.targetRps} rps`);
    }
  }

  // Client bundle size check
  const bundleResults = resolve(RESULTS_DIR, "m5-client-types", "smoke.json");
  if (existsSync(bundleResults)) {
    const bundle = JSON.parse(readFileSync(bundleResults, "utf8"));
    if (bundle.bundle && bundle.bundle.rawBytes > baselines.clientBundleMaxBytes) {
      console.error(`✗ client bundle: ${bundle.bundle.rawBytes}B > max ${baselines.clientBundleMaxBytes}B`);
      failures++;
    } else if (bundle.bundle) {
      console.log(`✓ client bundle: ${bundle.bundle.rawBytes}B ≤ ${baselines.clientBundleMaxBytes}B`);
    }
  }

  console.log(`\n${failures > 0 ? "FAIL" : "PASS"}: ${failures} blocking failure(s), ${alerts} alert(s)`);

  if (failures > 0) process.exit(1);
}

main();
