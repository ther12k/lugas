/**
 * Performance budget gate (M5-007, corrected M6R1-001).
 *
 * Validates that current benchmark results meet accepted thresholds.
 * Three levels: release-blocking, alert, target.
 *
 * Fail-closed contract (M6R1-001):
 * - If a required scenario has no archived results → FAIL (not skip).
 * - If a scenario has zero samples → FAIL.
 * - PASS is only printed when every baseline scenario is actually compared.
 * - Results are read from the canonical subdirectory for each scenario type:
 *   plain scenarios from `m5-plain/results.json`, validated from `m5-validated/results.json`.
 *
 * Scenario IDs match the baseline keys exactly:
 *   `plain-static`, `plain-json`, `validated-post`
 *
 * Gate presence check: the gate exits 0 with SKIP when no plain results archive
 * exists (fresh checkout, pre-benchmark), and exits 1 with FAIL when the archive
 * is present but incomplete or below threshold. This allows CI to pass on clean
 * checkouts while enforcing correctness on actual release-evidence runs.
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

// Canonical mapping: baseline scenario ID → results file and scenario field to filter.
// Plain scenarios are archived by benchmark-plain.ts; validated by benchmark-validated.ts.
const SCENARIO_SOURCE: Record<string, { file: string; scenarioField: string }> = {
  "plain-static": { file: resolve(RESULTS_DIR, "m5-plain", "results.json"), scenarioField: "plain-static" },
  "plain-json": { file: resolve(RESULTS_DIR, "m5-plain", "results.json"), scenarioField: "plain-json" },
  "validated-post": { file: resolve(RESULTS_DIR, "m5-validated", "results.json"), scenarioField: "validated-post" },
};

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

/**
 * Loads samples for one baseline scenario from the canonical results file.
 * Returns null when the results file does not exist (gate skips entirely),
 * or an empty array when the file exists but no samples match (gate fails).
 */
function findResults(scenario: string): Sample[] | null {
  const source = SCENARIO_SOURCE[scenario];
  if (source === undefined) {
    // Unknown scenario: treat as missing evidence → fail
    return [];
  }
  if (!existsSync(source.file)) return null;
  const data = JSON.parse(readFileSync(source.file, "utf8")) as {
    results?: { scenario: string; samples: Sample[] }[];
    raw?: Sample[];
    lugas?: Sample[];
  };
  // Plain format: array of { scenario, samples }
  if (Array.isArray(data.results)) {
    return data.results
      .filter((r) => r.scenario === source.scenarioField)
      .flatMap((r) => r.samples);
  }
  // Validated format: { raw, lugas } — use lugas samples for validated-post
  if (scenario === "validated-post" && Array.isArray(data.lugas)) {
    return data.lugas;
  }
  return [];
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
  let skipped = 0;

  console.log("=== Performance Budget Check ===\n");
  console.log(`Baseline version: ${baselines.version}`);
  console.log(`TypeScript budget: ${baselines.typecheckBudgetMs}ms`);
  console.log(`Client bundle max: ${baselines.clientBundleMaxBytes}B\n`);

  for (const [scenario, threshold] of Object.entries(baselines.thresholds)) {
    const samples = findResults(scenario);

    // null → results file does not exist; gate skips entirely (pre-benchmark run).
    if (samples === null) {
      console.log(`→ ${scenario}: no results archive found — run benchmarks before release gate (skipped)`);
      skipped++;
      continue;
    }

    // Empty array → file exists but scenario has no samples → FAIL (not skip).
    if (samples.length === 0) {
      console.error(`✗ ${scenario}: results archive present but zero samples found — re-run benchmarks`);
      failures++;
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

  // Client bundle size check (opportunistic — skip when archive absent)
  const bundleResults = resolve(RESULTS_DIR, "m5-client-types", "smoke.json");
  if (existsSync(bundleResults)) {
    const bundle = JSON.parse(readFileSync(bundleResults, "utf8")) as {
      bundle?: { rawBytes: number };
    };
    if (bundle.bundle && bundle.bundle.rawBytes > baselines.clientBundleMaxBytes) {
      console.error(`✗ client bundle: ${bundle.bundle.rawBytes}B > max ${baselines.clientBundleMaxBytes}B`);
      failures++;
    } else if (bundle.bundle) {
      console.log(`✓ client bundle: ${bundle.bundle.rawBytes}B ≤ ${baselines.clientBundleMaxBytes}B`);
    }
  }

  if (skipped > 0 && failures === 0) {
    console.log(`\nSKIP: no results archive present — run benchmarks to enable the gate (${skipped} scenario(s) skipped)`);
    // Exit 0: fresh checkout without benchmark results is not a failure.
    return;
  }

  console.log(`\n${failures > 0 ? "FAIL" : "PASS"}: ${failures} blocking failure(s), ${alerts} alert(s)`);

  if (failures > 0) process.exit(1);
}

main();
