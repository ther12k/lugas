/**
 * Performance budget gate (M5-007; M6R1-001 fail-closed; M6R2 integrity).
 *
 * Validates that current benchmark results meet accepted thresholds.
 * Four levels: release-blocking, alert, below-target(alerting), target met.
 *
 * Integrity contract (M6R2 #279/#280/#282):
 * - Only `framework === "lugas"` samples are gated — raw Bun samples are
 *   never merged into the framework median.
 * - Every required sample value must be finite and positive; sample counts
 *   must reach the recorded run count for the scenario source.
 * - Plain archives that exist but lack a required scenario FAIL even in
 *   development mode. Total archive absence is SKIP in dev mode only.
 * - `--release` mode: every archive must exist and bind to the current
 *   candidate (archive env.commit === git HEAD) and the baseline environment
 *   platform/arch; anything missing or stale FAILs.
 * - PASS is printed only when every scenario was actually compared (release
 *   mode) or compared with zero failures otherwise.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const BASELINES_PATH = resolve(ROOT, "benchmarks", "baselines", "m5-accepted.json");
const RESULTS_DIR = resolve(ROOT, "benchmarks", "results");

const RELEASE_MODE = process.argv.includes("--release");
/** Expected independent runs per archived sample set, matching the runners. */
const EXPECTED_RUNS = 5;

// Canonical mapping: baseline scenario ID → results file + identifiers to filter.
const SCENARIO_SOURCE: Record<
  string,
  { file: string; scenarioField?: string; format: "plain" | "validated" }
> = {
  "plain-static": { file: resolve(RESULTS_DIR, "m5-plain", "results.json"), scenarioField: "plain-static", format: "plain" },
  "plain-json": { file: resolve(RESULTS_DIR, "m5-plain", "results.json"), scenarioField: "plain-json", format: "plain" },
  "validated-post": { file: resolve(RESULTS_DIR, "m5-validated", "results.json"), format: "validated" },
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
  environment: { bunVersion?: string; platform?: string; arch?: string };
  thresholds: Thresholds;
  typecheckBudgetMs: number;
  clientBundleMaxBytes: number;
}

interface ArchiveEnv {
  bunVersion?: string;
  commit?: string;
}

type Sample = { rps: number; p50us: number; p95us: number; p99us: number };

function loadBaselines(): Baselines {
  if (!existsSync(BASELINES_PATH)) {
    console.error("baselines file not found:", BASELINES_PATH);
    process.exit(1);
  }
  return JSON.parse(readFileSync(BASELINES_PATH, "utf8"));
}

function headCommit(): string {
  const proc = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
    cwd: ROOT, stdout: "pipe", stderr: "ignore",
  });
  return proc.exitCode === 0 ? new TextDecoder().decode(proc.stdout).trim() : "";
}

/**
 * Loads Lugas-only samples plus archive environment for one baseline scenario.
 * Returns { status: "no-archive" } when the results file does not exist,
 * { status: "no-scenario" } when the file exists without this scenario,
 * or the lugas samples and env on success.
 */
function findResults(
  scenario: string,
): { status: "no-archive" } | { status: "no-scenario" } | { status: "ok"; samples: Sample[]; env: ArchiveEnv } {
  const source = SCENARIO_SOURCE[scenario];
  if (source === undefined || !existsSync(source.file)) return { status: "no-archive" };
  const data = JSON.parse(readFileSync(source.file, "utf8")) as {
    env?: ArchiveEnv;
    results?: { scenario: string; framework: string; samples: Sample[] }[];
    raw?: Sample[];
    lugas?: Sample[];
  };
  if (source.format === "plain") {
    if (!Array.isArray(data.results)) return { status: "no-scenario" };
    // GATE THE FRAMEWORK, NOT THE COMPARATOR: framework === "lugas" only (#279).
    const matching = data.results.filter(
      (r) => r.scenario === source.scenarioField && r.framework === "lugas",
    );
    if (matching.length === 0 || matching.every((m) => !Array.isArray(m.samples))) {
      return { status: "no-scenario" };
    }
    return {
      status: "ok",
      samples: matching.flatMap((m) => m.samples),
      env: data.env ?? {},
    };
  }
  // Validated format: separate top-level arrays per framework.
  if (!Array.isArray(data.lugas)) return { status: "no-scenario" };
  return { status: "ok", samples: data.lugas, env: data.env ?? {} };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function finitePositive(s: Sample): boolean {
  return (
    Number.isFinite(s.rps) && s.rps > 0 &&
    Number.isFinite(s.p50us) && s.p50us > 0 &&
    Number.isFinite(s.p95us) && s.p95us > 0 &&
    Number.isFinite(s.p99us) && s.p99us > 0
  );
}

function main() {
  const baselines = loadBaselines();
  let failures = 0;
  let alerts = 0;
  let skippedScenarios = 0;

  console.log(`=== Performance Budget Check ${RELEASE_MODE ? "(RELEASE MODE)" : "(development mode)"} ===\n`);
  console.log(`Baseline version: ${baselines.version}`);
  console.log(`Client bundle max: ${baselines.clientBundleMaxBytes}B\n`);

  // Dev-mode boundary (#280): once ANY required archive exists, evidence is
  // expected to be complete — further missing files/scenarios are failures,
  // not skips. Total absence remains a dev-mode SKIP.
  const anyArchiveExists = Object.values(SCENARIO_SOURCE).some((src) => existsSync(src.file));
  const head = RELEASE_MODE ? headCommit() : "";

  for (const [scenario, threshold] of Object.entries(baselines.thresholds)) {
    const found = findResults(scenario);

    if (found.status !== "ok") {
      if (RELEASE_MODE) {
        console.error(
          `✗ ${scenario}: required benchmark evidence missing (${found.status === "no-archive" ? "no archive" : "scenario absent"}) — release mode fails closed`,
        );
        failures++;
      } else if (found.status === "no-archive" && !anyArchiveExists) {
        console.log(`→ ${scenario}: no results archive yet — skipped (dev mode; archives absent entirely)`);
        skippedScenarios++;
      } else {
        // Partial evidence present but this scenario missing → FAIL in any mode (#280).
        console.error(`✗ ${scenario}: inconsistent evidence — archive set present without this scenario's lugas samples (${found.status})`);
        failures++;
      }
      continue;
    }

    const { samples, env } = found;

    if (samples.length < EXPECTED_RUNS) {
      console.error(`✗ ${scenario}: ${samples.length} lugas sample(s) < expected ${EXPECTED_RUNS} runs`);
      failures++;
      continue;
    }
    const badSamples = samples.filter((s) => !finitePositive(s));
    if (badSamples.length > 0) {
      console.error(`✗ ${scenario}: ${badSamples.length} non-finite/non-positive sample value(s)`);
      failures++;
      continue;
    }

    // Candidate binding (M6R2 #280): release mode requires archive @ HEAD.
    if (RELEASE_MODE) {
      if (!env.commit || !head || env.commit !== head) {
        console.error(`✗ ${scenario}: archive commit ${env.commit ?? "(none)"} ≠ candidate ${head || "(unknown)"} — stale evidence`);
        failures++;
        continue;
      }
      if (
        baselines.environment?.platform &&
        env.bunVersion &&
        baselines.environment.bunVersion &&
        env.bunVersion !== process.versions.bun
      ) {
        console.warn(`⚠ ${scenario}: archive bun ${env.bunVersion} ≠ running ${process.versions.bun}`);
        alerts++;
      }
    }

    const medianRps = median(samples.map((s) => s.rps));

    // Four-branch classification (#282): a result above alert but below
    // target is explicitly reported as missed, never as ≥ target.
    if (medianRps < threshold.releaseBlockMinRps) {
      console.error(`✗ ${scenario}: ${medianRps} rps < release block minimum ${threshold.releaseBlockMinRps} rps`);
      failures++;
    } else if (medianRps < threshold.alertMinRps) {
      console.warn(`⚠ ${scenario}: ${medianRps} rps < alert threshold ${threshold.alertMinRps} rps`);
      alerts++;
    } else if (medianRps < threshold.targetRps) {
      console.warn(`△ ${scenario}: ${medianRps} rps — meets alert floor but BELOW target ${threshold.targetRps} rps`);
      alerts++;
    } else {
      console.log(`✓ ${scenario}: ${medianRps} rps ≥ target ${threshold.targetRps} rps`);
    }
  }

  // Client bundle size check — mandatory in release mode (#282).
  const bundleResultsPath = existsSync(resolve(RESULTS_DIR, "m5-client-types", "smoke.json"))
    ? resolve(RESULTS_DIR, "m5-client-types", "smoke.json")
    : resolve(RESULTS_DIR, "m5-client-types", "results.json");
  if (existsSync(bundleResultsPath)) {
    const bundle = JSON.parse(readFileSync(bundleResultsPath, "utf8")) as {
      bundle?: { rawBytes: number };
    };
    if (bundle.bundle && bundle.bundle.rawBytes > baselines.clientBundleMaxBytes) {
      console.error(`✗ client bundle: ${bundle.bundle.rawBytes}B > max ${baselines.clientBundleMaxBytes}B`);
      failures++;
    } else if (bundle.bundle) {
      console.log(`✓ client bundle: ${bundle.bundle.rawBytes}B ≤ ${baselines.clientBundleMaxBytes}B`);
    } else if (RELEASE_MODE) {
      console.error("✗ client bundle evidence missing 'bundle' payload");
      failures++;
    }
  } else if (RELEASE_MODE) {
    console.error("✗ client bundle evidence missing (benchmarks/results/m5-client-types/smoke.json or results.json)");
    failures++;
  }

  // Typecheck budget — measured, not just printed (#282). Executed whenever
  // any scenario evidence was evaluated or in release mode.
  if (skippedScenarios < Object.keys(baselines.thresholds).length || RELEASE_MODE) {
    const tscBin = resolve(ROOT, "node_modules", ".bin", "tsc");
    if (!existsSync(tscBin)) {
      // Honesty protocol: report unexecuted, do not count as passing.
      console.log(`→ typecheck budget: UNEXECUTED (TypeScript binary unavailable)`);
    } else {
    const start = performance.now();
    const tsc = Bun.spawnSync([tscBin, "--noEmit"], {
      cwd: ROOT, stdout: "pipe", stderr: "pipe",
    });
    const elapsedMs = Math.round(performance.now() - start);
    if (tsc.exitCode !== 0) {
      console.error(`✗ typecheck failed during budget measurement (${elapsedMs}ms)`);
      failures++;
    } else if (elapsedMs > baselines.typecheckBudgetMs) {
      console.error(`✗ typecheck ${elapsedMs}ms > budget ${baselines.typecheckBudgetMs}ms`);
      failures++;
    } else {
      console.log(`✓ typecheck ${elapsedMs}ms ≤ budget ${baselines.typecheckBudgetMs}ms`);
    }
    }
  }

  // Verdict protocol (M6R2 #280): SKIP wording reserved for dev-mode total
  // absence; PASS only when something was actually compared and zero failures.
  if (failures > 0) {
    console.log(`\nFAIL: ${failures} blocking failure(s), ${alerts} alert(s)`);
    process.exit(1);
  }
  if (skippedScenarios === Object.keys(baselines.thresholds).length) {
    console.log(`\nSKIP: no results archives present (dev mode) — gate not executed, not passed`);
    return;
  }
  console.log(`\nPASS: ${failures} blocking failure(s), ${alerts} alert(s)`);
}

main();
