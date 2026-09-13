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
