/**
 * Perf-gate invocation pins (CA-13): the verify wrapper's release skip hole
 * is closed at the decision level (truth table) and at the checker level
 * (release mode with no archives exits nonzero — the wrapper must ask, and
 * the checker must fail closed when asked).
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { resolvePerfGatePlan } from "../../scripts/perf-gate-plan";
import { CANDIDATE_VERSION } from "../../scripts/release/candidate-version";

const ROOT = resolve(import.meta.dir, "..", "..");

describe("verify perf-gate plan (truth table)", () => {
  test("development, no archives → documented SKIP", () => {
    const plan = resolvePerfGatePlan({ release: false, hasPlainArchive: false });
    expect(plan.run).toBe(false);
    if (!plan.run) expect(plan.skipReason).toContain("development mode");
  });

  test("release, no archives → run --release (checker fails closed on missing evidence)", () => {
    const plan = resolvePerfGatePlan({ release: true, hasPlainArchive: false });
    expect(plan).toEqual({ run: true, argv: ["--release"] });
  });

  test("development, archive present → run in development mode", () => {
    const plan = resolvePerfGatePlan({ release: false, hasPlainArchive: true });
    expect(plan).toEqual({ run: true, argv: [] });
  });

  test("release, archive present → run --release (checks decide)", () => {
    const plan = resolvePerfGatePlan({ release: true, hasPlainArchive: true });
    expect(plan).toEqual({ run: true, argv: ["--release"] });
  });

  test("release + deferred → run --release --defer-perf regardless of archives (ODR-0020)", () => {
    const plan = resolvePerfGatePlan({ release: true, hasPlainArchive: false, deferred: true });
    expect(plan).toEqual({ run: true, argv: ["--release", "--defer-perf"] });
    const withArchive = resolvePerfGatePlan({ release: true, hasPlainArchive: true, deferred: true });
    expect(withArchive).toEqual({ run: true, argv: ["--release", "--defer-perf"] });
  });

  test("deferred without release is inert (development mode keeps dev-mode plan)", () => {
    const plan = resolvePerfGatePlan({ release: false, hasPlainArchive: false, deferred: true });
    expect(plan.run).toBe(false);
    if (!plan.run) expect(plan.skipReason).toContain("development mode");
  });
});

describe("checker fails closed in release mode without archives", () => {
  test("LUGAS_PERF_RELEASE with no archives exits nonzero (nonzero-exit pin)", () => {
    // Sandbox mirrors the perf-gate-integrity harness: checker + release
    // identity module + baselines, results/ EMPTY — the exact state the old
    // wrapper silently skipped. The checker must exit nonzero in --release.
    const root = mkdtempSync(join(tmpdir(), "lugas-verifyskip-"));
    try {
      mkdirSync(join(root, "scripts", "release"), { recursive: true });
      mkdirSync(join(root, "benchmarks", "baselines"), { recursive: true });
      mkdirSync(join(root, "benchmarks", "results"), { recursive: true });
      const src = readFileSync(join(ROOT, "scripts", "check-performance-budget.ts"), "utf8");
      writeFileSync(
        join(root, "scripts", "check-performance-budget.ts"),
        src.replace('const ROOT = resolve(import.meta.dir, "..");', "const ROOT = import.meta.dir + \"/..\";"),
      );
      writeFileSync(
        join(root, "scripts", "release", "candidate-version.ts"),
        readFileSync(join(ROOT, "scripts", "release", "candidate-version.ts"), "utf8"),
      );
      writeFileSync(
        join(root, "benchmarks", "baselines", "m5-accepted.json"),
        readFileSync(join(ROOT, "benchmarks", "baselines", "m5-accepted.json"), "utf8"),
      );

      const proc = Bun.spawnSync(["bun", "run", join(root, "scripts", "check-performance-budget.ts"), "--release"], {
        cwd: root,
        stdout: "pipe",
        stderr: "pipe",
      });
      const out = `${new TextDecoder().decode(proc.stdout)}${new TextDecoder().decode(proc.stderr)}`;
      expect(proc.exitCode).not.toBe(0); // release mode + no archives must FAIL, never SKIP
      expect(out).toContain("release mode fails closed");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("checker deferral contract (--defer-perf, ODR-0020)", () => {
  /** Sandbox: checker + identity module + baselines + rehearsal tarball. */
  function makeSandbox(): string {
    const root = mkdtempSync(join(tmpdir(), "lugas-deferperf-"));
    mkdirSync(join(root, "scripts", "release"), { recursive: true });
    mkdirSync(join(root, "benchmarks", "baselines"), { recursive: true });
    mkdirSync(join(root, "benchmarks", "results"), { recursive: true });
    mkdirSync(join(root, "docs", "releases", "beta"), { recursive: true });
    const src = readFileSync(join(ROOT, "scripts", "check-performance-budget.ts"), "utf8");
    writeFileSync(
      join(root, "scripts", "check-performance-budget.ts"),
      src.replace('const ROOT = resolve(import.meta.dir, "..");', "const ROOT = import.meta.dir + \"/..\";"),
    );
    writeFileSync(
      join(root, "scripts", "release", "candidate-version.ts"),
      readFileSync(join(ROOT, "scripts", "release", "candidate-version.ts"), "utf8"),
    );
    writeFileSync(
      join(root, "benchmarks", "baselines", "m5-accepted.json"),
      readFileSync(join(ROOT, "benchmarks", "baselines", "m5-accepted.json"), "utf8"),
    );
    writeFileSync(join(root, "docs", "releases", "beta", `lugas-${CANDIDATE_VERSION}.tgz`), "tarball-bytes");
    return root;
  }

  function runChecker(root: string, args: string[], env: Record<string, string>) {
    // Strip outer perf-gate env: when this suite runs inside a release or
    // deferred verify (the packet pipeline exports LUGAS_PERF_*), the outer
    // variables must not leak into the sandboxed checker's contract tests.
    const inherited = { ...process.env };
    for (const key of ["LUGAS_PERF_RELEASE", "LUGAS_PERF_DEFERRED", "LUGAS_PERF_DEFERRAL_REF", "LUGAS_PACKAGE_SOURCE_SHA"]) {
      delete inherited[key];
    }
    const proc = Bun.spawnSync(["bun", "run", join(root, "scripts", "check-performance-budget.ts"), ...args], {
      cwd: root,
      env: { ...inherited, ...env },
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = `${new TextDecoder().decode(proc.stdout)}${new TextDecoder().decode(proc.stderr)}`;
    return { exitCode: proc.exitCode, out };
  }

  test("deferral without an authorizing decision reference is rejected", () => {
    const root = makeSandbox();
    try {
      const { exitCode, out } = runChecker(root, ["--release", "--defer-perf"], {});
      expect(exitCode).not.toBe(0);
      expect(out).toContain("LUGAS_PERF_DEFERRAL_REF");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("--defer-perf without --release is rejected", () => {
    const root = makeSandbox();
    try {
      const { exitCode, out } = runChecker(root, ["--defer-perf"], { LUGAS_PERF_DEFERRAL_REF: "ODR-0020" });
      expect(exitCode).not.toBe(0);
      expect(out).toContain("only valid with --release");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("referenced deferral writes evidence with perfGate=deferred, null measurements, bound tarball", () => {
    const root = makeSandbox();
    try {
      const { exitCode, out } = runChecker(
        root,
        ["--release", "--defer-perf", "--package-source-sha", "abc123"],
        { LUGAS_PERF_DEFERRAL_REF: "ODR-0020" },
      );
      expect(exitCode).toBe(0);
      expect(out).toContain("DEFERRED");
      expect(out).toContain("not passed");
      const evidence = JSON.parse(readFileSync(join(root, "docs", "releases", "beta", "release-evidence.json"), "utf8"));
      expect(evidence.perfGate).toBe("deferred");
      expect(evidence.deferralRef).toBe("ODR-0020");
      expect(evidence.packageSourceCommit).toBe("abc123");
      expect(evidence.plainStaticRps).toBeNull();
      expect(evidence.typecheckMs).toBeNull();
      expect(evidence.clientBundleBytes).toBeNull();
      expect(evidence.environment).toBeNull();
      expect(evidence.tarballSha256).not.toBeNull();
      expect(evidence.blockingFailures).toBe(0);
      expect(evidence.alerts).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
