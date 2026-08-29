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
 *   candidate (archive env.commit === package source / HEAD) and this
 *   machine's platform/arch — recorded by every runner (M6R6.1 #311) and
 *   enforced here. Client bundle archives carry their own
 *   `lugas-client-benchmark-v2` binding (commit + platform/arch); legacy
 *   unbound client archives are never used. Anything missing or stale FAILs.
 * - PASS is printed only when every scenario was actually compared (release
 *   mode) or compared with zero failures otherwise.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const BASELINES_PATH = resolve(ROOT, "benchmarks", "baselines", "m5-accepted.json");
const RESULTS_DIR = resolve(ROOT, "benchmarks", "results");

const RELEASE_MODE = process.argv.includes("--release");
/**
 * M6R5 two-identity model:
 *  - attestationCommit: HEAD where the gate runs (this checkout).
 *  - packageSourceCommit: the tree the beta package was built from, pinned
 *    explicitly via --package-source-sha (or LUGAS_PACKAGE_SOURCE_SHA).
 * Evidence records BOTH; equality is not required (a release pipeline
 * attests a source commit from a later attestation checkout).
 */
function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const PACKAGE_SOURCE_SHA =
  argValue("--package-source-sha") ?? process.env.LUGAS_PACKAGE_SOURCE_SHA ?? null;
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
  platform?: string;
  arch?: string;
  cpuModel?: string;
  loadAverageBefore?: number[];
  loadAverageAfter?: number[];
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
): { status: "no-archive" } | { status: "no-scenario" } | { status: "ok"; samples: Sample[]; rawComparatorSamples: Sample[]; env: ArchiveEnv } {
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
    // Keep the raw-Bun comparator of the SAME scenario for overhead reporting.
    const rawComparator = data.results.find(
      (r) => r.scenario === source.scenarioField && r.framework === "raw-bun",
    );
    return {
      status: "ok",
      samples: matching.flatMap((m) => m.samples),
      rawComparatorSamples: Array.isArray(rawComparator?.samples) ? rawComparator!.samples : [],
      env: data.env ?? {},
    };
  }
  // Validated format: separate top-level arrays per framework.
  if (!Array.isArray(data.lugas)) return { status: "no-scenario" };
  return {
    status: "ok",
    samples: data.lugas,
    rawComparatorSamples: Array.isArray(data.raw) ? data.raw : [],
    env: data.env ?? {},
  };
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
  /** Measured medians per scenario, recorded for machine-readable evidence (M6R4). */
  const lastMedians: Record<string, number> = {};
  /** Raw-Bun comparator medians (per-scenario overhead denominators, M6R5). */
  const lastRawMedians: Record<string, number> = {};
  let lastTypecheckMs: number | null = null;
  let lastBundleBytes: number | null = null;
  /** Plain-archive environment, recorded into release evidence for audit (M6R6.1). */
  let lastPlainEnv: ArchiveEnv | null = null;

  // Release runs are evidence runs: the smoke-only archive-suppression flag
  // must never leak into a release execution (#M6R3).
  if (RELEASE_MODE && process.env.LUGAS_BENCH_NO_ARCHIVE === "1") {
    console.error("✗ LUGAS_BENCH_NO_ARCHIVE=1 is invalid in --release mode — release runs must archive evidence");
    process.exit(1);
  }

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

    const { samples, env, rawComparatorSamples } = found;
    if (rawComparatorSamples.length > 0) {
      lastRawMedians[scenario] = median(rawComparatorSamples.map((x) => x.rps));
    }

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

    // Candidate binding (M6R2 #280; M6R5 two-identity): archives must be
    // bound to the package source tree when pinned, else to attestation HEAD.
    if (RELEASE_MODE) {
      const requiredCommit = PACKAGE_SOURCE_SHA ?? head;
      if (!env.commit || !requiredCommit || env.commit !== requiredCommit) {
        console.error(`✗ ${scenario}: archive commit ${env.commit ?? "(none)"} ≠ package source ${requiredCommit || "(unknown)"} — stale evidence`);
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
      // M6R6.1 #311: enforce the platform/arch binding the header contract
      // claims. Archives that do not record (or disagree with) this machine's
      // platform/arch are cross-machine or pre-binding evidence.
      if (env.platform !== process.platform || env.arch !== process.arch) {
        console.error(
          `✗ ${scenario}: archive environment ${env.platform ?? "?"}/${env.arch ?? "?"} ≠ this host ${process.platform}/${process.arch} — cross-machine evidence`,
        );
        failures++;
        continue;
      }
      if (scenario === "plain-static") lastPlainEnv = env;
    }

    const medianRps = median(samples.map((s) => s.rps));
    lastMedians[scenario] = medianRps;

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
  // M6R6.1 #311: the client archive must carry the `lugas-client-benchmark-v2`
  // binding. Legacy/unbound archives are NEVER used (their bytes could be
  // leftovers from an older candidate); in release mode their presence FAILs.
  const bundleResultsPath = existsSync(resolve(RESULTS_DIR, "m5-client-types", "smoke.json"))
    ? resolve(RESULTS_DIR, "m5-client-types", "smoke.json")
    : resolve(RESULTS_DIR, "m5-client-types", "results.json");
  if (existsSync(bundleResultsPath)) {
    const client = JSON.parse(readFileSync(bundleResultsPath, "utf8")) as {
      format?: string;
      env?: ArchiveEnv;
      bundle?: { rawBytes?: number };
    };
    if (client.format !== "lugas-client-benchmark-v2") {
      if (RELEASE_MODE) {
        console.error(
          "✗ client bundle evidence has no candidate binding (legacy format) — re-run scripts/benchmark-client-types.ts",
        );
        failures++;
      } else {
        console.log("→ client bundle: legacy unbound archive ignored (dev mode) — re-run scripts/benchmark-client-types.ts for evidence");
      }
    } else {
      const rawBytes = client.bundle?.rawBytes;
      if (typeof rawBytes !== "number" || !Number.isFinite(rawBytes) || rawBytes <= 0) {
        console.error(`✗ client bundle: invalid rawBytes ${String(rawBytes)}`);
        failures++;
      } else if (RELEASE_MODE) {
        const requiredCommit = PACKAGE_SOURCE_SHA ?? head;
        if (!client.env?.commit || !requiredCommit || client.env.commit !== requiredCommit) {
          console.error(`✗ client bundle: archive commit ${client.env?.commit ?? "(none)"} ≠ package source ${requiredCommit || "(unknown)"} — stale evidence`);
          failures++;
        } else if (client.env.platform !== process.platform || client.env.arch !== process.arch) {
          console.error(`✗ client bundle: archive environment ${client.env.platform ?? "?"}/${client.env.arch ?? "?"} ≠ this host ${process.platform}/${process.arch} — cross-machine evidence`);
          failures++;
        } else if (rawBytes > baselines.clientBundleMaxBytes) {
          console.error(`✗ client bundle: ${rawBytes}B > max ${baselines.clientBundleMaxBytes}B`);
          failures++;
        } else {
          lastBundleBytes = rawBytes;
          console.log(`✓ client bundle: ${rawBytes}B ≤ ${baselines.clientBundleMaxBytes}B (bound to package source)`);
        }
      } else {
        if (rawBytes > baselines.clientBundleMaxBytes) {
          console.error(`✗ client bundle: ${rawBytes}B > max ${baselines.clientBundleMaxBytes}B`);
          failures++;
        } else {
          lastBundleBytes = rawBytes;
          console.log(`✓ client bundle: ${rawBytes}B ≤ ${baselines.clientBundleMaxBytes}B`);
        }
      }
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
      if (RELEASE_MODE) {
        // Fail closed: a release gate that never measured the typecheck
        // budget must not print PASS (#M6R3).
        console.error("✗ typecheck budget UNEXECUTED in --release mode (TypeScript binary unavailable)");
        failures++;
      } else {
        console.log(`→ typecheck budget: UNEXECUTED (TypeScript binary unavailable)`);
      }
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
      lastTypecheckMs = elapsedMs;
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

  // Machine-readable release evidence (M6R4): the packet builder consumes
  // this file instead of narrative defaults. Written only in release mode on
  // success — the packet builder fails closed without it.
  if (RELEASE_MODE) {
    let tarballHash: string | null = null;
    const tgz = resolve(ROOT, "docs", "releases", "beta", "lugas-0.1.0-beta.1.tgz");
    if (existsSync(tgz)) {
      const { createHash } = require("node:crypto") as typeof import("node:crypto");
      tarballHash = createHash("sha256").update(readFileSync(tgz)).digest("hex");
    }

    const evidence = {
      format: "lugas-release-evidence-v2",
      packageSourceCommit: PACKAGE_SOURCE_SHA,
      attestationCommit: head || null,
      measuredAt: new Date().toISOString(),
      bunVersion: process.versions.bun,
      plainStaticRps: lastMedians["plain-static"] ?? null,
      plainJsonRps: lastMedians["plain-json"] ?? null,
      validatedPostRps: lastMedians["validated-post"] ?? null,
      typecheckMs: lastTypecheckMs,
      clientBundleBytes: lastBundleBytes,
      tarballSha256: tarballHash,
      rawBunPlainStaticRps: lastRawMedians["plain-static"] ?? null,
      rawBunValidatedPostRps: lastRawMedians["validated-post"] ?? null,
      // M6R6.1 #311: machine conditions of the measured run, recorded for
      // audit instead of a narrative "quiet host" claim.
      environment: lastPlainEnv === null ? null : {
        platform: lastPlainEnv.platform ?? null,
        arch: lastPlainEnv.arch ?? null,
        cpuModel: lastPlainEnv.cpuModel ?? null,
        bunVersion: lastPlainEnv.bunVersion ?? null,
      },
      loadAverage: lastPlainEnv?.loadAverageBefore && lastPlainEnv?.loadAverageAfter ? {
        before: lastPlainEnv.loadAverageBefore,
        after: lastPlainEnv.loadAverageAfter,
      } : null,
      blockingFailures: failures,
      alerts,
    };
    mkdirSync(resolve(ROOT, "docs", "releases", "beta"), { recursive: true });
    writeFileSync(
      resolve(ROOT, "docs", "releases", "beta", "release-evidence.json"),
      JSON.stringify(evidence, null, 2) + "\n",
    );
    console.log(`Release evidence written to docs/releases/beta/release-evidence.json`);
  }
}

main();
