/**
 * Perf-gate integrity regression tests (M6R2 #279/#280/#282).
 *
 * Builds synthetic archives in a sandbox and runs the real checker via
 * subprocess so exit codes are authoritative:
 * - fast raw-bun + slow lugas must FAIL (framework samples never merge);
 * - partial archive (plain present, validated missing) must FAIL in dev mode;
 * - total absence must SKIP with exit 0;
 * - release mode fails on any missing archive or stale commit.
 */
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const CHECKER = resolve(ROOT, "scripts/check-performance-budget.ts");

type Row = { scenario: string; framework: string; samples: Array<{ rps: number; p50us: number; p95us: number; p99us: number }> };

function writePlainArchive(
  resultsDir: string,
  rows: Row[],
  envCommit?: string,
  envExtra?: Record<string, unknown>,
): void {
  mkdirSync(join(resultsDir, "m5-plain"), { recursive: true });
  const env = {
    bunVersion: process.versions.bun,
    ...(envCommit !== undefined ? { commit: envCommit } : {}),
    ...envExtra,
  };
  writeFileSync(
    join(resultsDir, "m5-plain", "results.json"),
    JSON.stringify({ env, results: rows }),
  );
}

type ClientArchive = {
  format?: string;
  env?: { commit?: string; bunVersion?: string; platform?: string; arch?: string };
  bundle?: { rawBytes?: number };
};

function writeClientArchive(resultsDir: string, archive: ClientArchive): void {
  mkdirSync(join(resultsDir, "m5-client-types"), { recursive: true });
  writeFileSync(join(resultsDir, "m5-client-types", "smoke.json"), JSON.stringify(archive));
}

function writeValidatedArchive(
  resultsDir: string,
  rps: number,
  envCommit?: string,
): void {
  mkdirSync(join(resultsDir, "m5-validated"), { recursive: true });
  const env = { bunVersion: process.versions.bun, ...(envCommit !== undefined ? { commit: envCommit } : {}) };
  const mk = () => ({ rps, p50us: 40, p95us: 45, p99us: 50 });
  writeFileSync(
    join(resultsDir, "m5-validated", "results.json"),
    JSON.stringify({ env, raw: Array(5).fill(mk()), lugas: Array(5).fill(mk()) }),
  );
}

function runChecker(env: Record<string, string>): { code: number; output: string } {
  const proc = Bun.spawnSync(["bun", "run", CHECKER], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });
  return {
    code: proc.exitCode ?? 1,
    output:
      new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr),
  };
}

function makeSandbox(): string {
  // The checker resolves results relative to repo ROOT; to sandbox without
  // touching the worktree we point it at ROOT but swap directories is not
  // possible — instead we assert against the REAL archived results dir only
  // when empty. For synthetic cases we copy the checker concept: simplest
  // reliable approach is a temp git-less clone of just the needed files.
  // Chosen approach: run checker inside temp dir mirroring scripts/ + benchmarks/baselines.
  return mkdtempSync(join(tmpdir(), "lugas-perfgate-"));
}

function buildSandbox() {
  const root = makeSandbox();
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "benchmarks", "baselines"), { recursive: true });
  mkdirSync(join(root, "benchmarks", "results"), { recursive: true });
  {
    const src = readFileSync(resolve(ROOT, "scripts/check-performance-budget.ts"), "utf8");
    writeFileSync(join(root, "scripts", "check-performance-budget.ts"), src.replace(
      'const ROOT = resolve(import.meta.dir, "..");',
      "const ROOT = import.meta.dir + \"/..\";",
    ));
    const bl = readFileSync(resolve(ROOT, "benchmarks/baselines/m5-accepted.json"), "utf8");
    writeFileSync(join(root, "benchmarks", "baselines", "m5-accepted.json"), bl);
  }
  return {
    root,
    checkerPath: join(root, "scripts", "check-performance-budget.ts"),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

const FAST_RAW = { rps: 100000, p50us: 10, p95us: 20, p99us: 30 };
const SLOW_LUGAS = { rps: 10000, p50us: 90, p95us: 95, p99us: 99 };
const HEALTHY_LUGAS = { rps: 60000, p50us: 15, p95us: 25, p99us: 35 };

describe("perf gate integrity (M6R2)", () => {
  test("fast raw-bun cannot mask slow lugas (#279)", () => {
    const sb = buildSandbox();
    try {
      writePlainArchive(join(sb.root, "benchmarks", "results"), [
        { scenario: "plain-static", framework: "raw-bun", samples: Array(5).fill(FAST_RAW) },
        { scenario: "plain-static", framework: "lugas", samples: Array(5).fill(SLOW_LUGAS) },
        { scenario: "plain-json", framework: "raw-bun", samples: Array(5).fill(FAST_RAW) },
        { scenario: "plain-json", framework: "lugas", samples: Array(5).fill(SLOW_LUGAS) },
      ]);
      const proc = Bun.spawnSync(["bun", "run", sb.checkerPath], {
        cwd: sb.root, stdout: "pipe", stderr: "pipe",
      });
      const out = new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr);
      expect(proc.exitCode).toBe(1);
      expect(out).toContain("FAIL");
      expect(out).toContain("release block minimum");
    } finally {
      sb.cleanup();
    }
  });

  test("healthy lugas-only archives PASS in dev mode", () => {
    const sb = buildSandbox();
    try {
      const rd = join(sb.root, "benchmarks", "results");
      writePlainArchive(rd, [
        { scenario: "plain-static", framework: "lugas", samples: Array(5).fill(HEALTHY_LUGAS) },
        { scenario: "plain-json", framework: "lugas", samples: Array(5).fill(HEALTHY_LUGAS) },
      ]);
      writeValidatedArchive(rd, 35000);
      const proc = Bun.spawnSync(["bun", "run", sb.checkerPath], {
        cwd: sb.root, stdout: "pipe", stderr: "pipe",
      });
      const out = new TextDecoder().decode(proc.stdout);
      expect(proc.exitCode).toBe(0);
      expect(out).toContain("PASS");
      // dev-mode typecheck measurement still runs because evidence was compared
      expect(out).toContain("typecheck");
    } finally {
      sb.cleanup();
    }
  });

  test("partial archive FAILs in dev mode (#280)", () => {
    const sb = buildSandbox();
    try {
      // only plain — validated-post absent while plain scenarios exist
      writePlainArchive(join(sb.root, "benchmarks", "results"), [
        { scenario: "plain-static", framework: "lugas", samples: Array(5).fill(HEALTHY_LUGAS) },
        { scenario: "plain-json", framework: "lugas", samples: Array(5).fill(HEALTHY_LUGAS) },
      ]);
      const proc = Bun.spawnSync(["bun", "run", sb.checkerPath], {
        cwd: sb.root, stdout: "pipe", stderr: "pipe",
      });
      const out = new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr);
      expect(proc.exitCode).toBe(1);
      expect(out).toContain("inconsistent evidence");
    } finally {
      sb.cleanup();
    }
  });

  test("total absence SKIPs with exit 0 in dev mode and says not passed", () => {
    const sb = buildSandbox();
    try {
      const proc = Bun.spawnSync(["bun", "run", sb.checkerPath], {
        cwd: sb.root, stdout: "pipe", stderr: "pipe",
      });
      const out = new TextDecoder().decode(proc.stdout);
      expect(proc.exitCode).toBe(0);
      expect(out).toContain("SKIP");
      expect(out).toContain("not passed");
    } finally {
      sb.cleanup();
    }
  });

  test("release mode fails on missing evidence and stale commits (#280)", async () => {
    const sb = buildSandbox();
    try {
      // No archives at all
      let proc = Bun.spawnSync(["bun", "run", sb.checkerPath, "--release"], {
        cwd: sb.root, stdout: "pipe", stderr: "pipe",
      });
      let out = new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr);
      expect(proc.exitCode).toBe(1);
      expect(out).toContain("RELEASE MODE");

      // With stale commit binding
      writePlainArchive(join(sb.root, "benchmarks", "results"), [
        { scenario: "plain-static", framework: "lugas", samples: Array(5).fill(HEALTHY_LUGAS) },
        { scenario: "plain-json", framework: "lugas", samples: Array(5).fill(HEALTHY_LUGAS) },
      ], "deadbeef-stale");
      proc = Bun.spawnSync(["bun", "run", sb.checkerPath, "--release"], {
        cwd: sb.root, stdout: "pipe", stderr: "pipe",
      });
      out = new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr);
      expect(proc.exitCode).toBe(1);
      expect(out).toContain("stale evidence");
    } finally {
      sb.cleanup();
    }
  });

  test("below-target-but-above-alert is reported as missed target (#282)", () => {
    const sb = buildSandbox();
    try {
      const midRps = 45000; // plain-static target 60k, alert 40k
      const mid = { rps: midRps, p50us: 20, p95us: 30, p99us: 40 };
      const rd = join(sb.root, "benchmarks", "results");
      writePlainArchive(rd, [
        { scenario: "plain-static", framework: "lugas", samples: Array(5).fill(mid) },
        { scenario: "plain-json", framework: "lugas", samples: Array(5).fill({ rps: 50000, p50us: 18, p95us: 28, p99us: 38 }) },
      ]);
      writeValidatedArchive(rd, 35000);
      const proc = Bun.spawnSync(["bun", "run", sb.checkerPath], {
        cwd: sb.root, stdout: "pipe", stderr: "pipe",
      });
      const out = new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr);
      expect(proc.exitCode).toBe(0); // alerting, not blocking
      expect(out).toContain("BELOW target");
      // The missed scenario's own line must not claim target attainment.
      const staticLine = out.split("\n").find((l) => l.includes("plain-static"));
      expect(staticLine).toBeDefined();
      expect(staticLine!).toContain("BELOW target");
      expect(staticLine!).not.toContain("≥ target");
    } finally {
      sb.cleanup();
    }
  });

  // ----- M6R6.1 #311: client archive binding + platform/arch enforcement -----

  /** Healthy archives bound to this host with an explicit commit. */
  function writeBoundArchives(rd: string, commit: string): void {
    const hostEnv = {
      platform: process.platform,
      arch: process.arch,
      cpuModel: "test-cpu",
      loadAverageBefore: [1, 2, 3],
      loadAverageAfter: [1, 2, 3],
    };
    writePlainArchive(rd, [
      { scenario: "plain-static", framework: "lugas", samples: Array(5).fill(HEALTHY_LUGAS) },
      { scenario: "plain-json", framework: "lugas", samples: Array(5).fill(HEALTHY_LUGAS) },
    ], commit, hostEnv);
    writeValidatedArchive(rd, 35000);
    // writeValidatedArchive writes {bunVersion, commit} only — rewrite with host fields
    const validated = JSON.parse(readFileSync(join(rd, "m5-validated", "results.json"), "utf8")) as { env: Record<string, unknown> };
    writeFileSync(join(rd, "m5-validated", "results.json"), JSON.stringify({ ...validated, env: { ...validated.env, ...hostEnv } }));
  }

  test("release mode rejects a legacy unbound client archive (M6R6.1 #311)", () => {
    const sb = buildSandbox();
    try {
      const rd = join(sb.root, "benchmarks", "results");
      writeBoundArchives(rd, "candidate-sha");
      // Legacy archive: real bytes shape from before #311 — no format, no env.
      writeClientArchive(rd, { bundle: { rawBytes: 14000 } });
      const proc = Bun.spawnSync(["bun", "run", sb.checkerPath, "--release"], {
        cwd: sb.root, stdout: "pipe", stderr: "pipe",
        env: { ...process.env, LUGAS_PACKAGE_SOURCE_SHA: "candidate-sha" },
      });
      const out = new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr);
      expect(proc.exitCode).toBe(1);
      expect(out).toContain("no candidate binding");
    } finally {
      sb.cleanup();
    }
  });

  test("release mode rejects a client archive bound to a foreign commit (M6R6.1 #311)", () => {
    const sb = buildSandbox();
    try {
      const rd = join(sb.root, "benchmarks", "results");
      writeBoundArchives(rd, "candidate-sha");
      writeClientArchive(rd, {
        format: "lugas-client-benchmark-v2",
        env: { commit: "deadbeef-stale", bunVersion: process.versions.bun, platform: process.platform, arch: process.arch },
        bundle: { rawBytes: 14000 },
      });
      const proc = Bun.spawnSync(["bun", "run", sb.checkerPath, "--release"], {
        cwd: sb.root, stdout: "pipe", stderr: "pipe",
        env: { ...process.env, LUGAS_PACKAGE_SOURCE_SHA: "candidate-sha" },
      });
      const out = new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr);
      expect(proc.exitCode).toBe(1);
      expect(out).toContain("client bundle: archive commit");
    } finally {
      sb.cleanup();
    }
  });

  test("release mode rejects cross-platform client and plain archives (M6R6.1 #311)", () => {
    const sb = buildSandbox();
    try {
      const rd = join(sb.root, "benchmarks", "results");
      // Plain archive measured on another OS but bound to the right commit.
      writeBoundArchives(rd, "candidate-sha");
      writePlainArchive(rd, [
        { scenario: "plain-static", framework: "lugas", samples: Array(5).fill(HEALTHY_LUGAS) },
        { scenario: "plain-json", framework: "lugas", samples: Array(5).fill(HEALTHY_LUGAS) },
      ], "candidate-sha", { platform: "darwin", arch: process.arch });
      writeClientArchive(rd, {
        format: "lugas-client-benchmark-v2",
        env: { commit: "candidate-sha", bunVersion: process.versions.bun, platform: process.platform, arch: process.arch },
        bundle: { rawBytes: 14000 },
      });
      const proc = Bun.spawnSync(["bun", "run", sb.checkerPath, "--release"], {
        cwd: sb.root, stdout: "pipe", stderr: "pipe",
        env: { ...process.env, LUGAS_PACKAGE_SOURCE_SHA: "candidate-sha" },
      });
      const out = new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr);
      expect(proc.exitCode).toBe(1);
      expect(out).toContain("cross-machine evidence");

      // Same but cross-machine CLIENT archive (plain archives healthy).
      writeBoundArchives(rd, "candidate-sha");
      writeClientArchive(rd, {
        format: "lugas-client-benchmark-v2",
        env: { commit: "candidate-sha", bunVersion: process.versions.bun, platform: "win32", arch: process.arch },
        bundle: { rawBytes: 14000 },
      });
      const proc2 = Bun.spawnSync(["bun", "run", sb.checkerPath, "--release"], {
        cwd: sb.root, stdout: "pipe", stderr: "pipe",
        env: { ...process.env, LUGAS_PACKAGE_SOURCE_SHA: "candidate-sha" },
      });
      const out2 = new TextDecoder().decode(proc2.stdout) + new TextDecoder().decode(proc2.stderr);
      expect(proc2.exitCode).toBe(1);
      expect(out2).toContain("client bundle: archive environment");
    } finally {
      sb.cleanup();
    }
  });

  test("dev mode ignores a legacy client archive without failing (M6R6.1 #311)", () => {
    const sb = buildSandbox();
    try {
      const rd = join(sb.root, "benchmarks", "results");
      writeBoundArchives(rd, "anything");
      writeClientArchive(rd, { bundle: { rawBytes: 999999 } });
      const proc = Bun.spawnSync(["bun", "run", sb.checkerPath], {
        cwd: sb.root, stdout: "pipe", stderr: "pipe",
      });
      const out = new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr);
      // Legacy bytes must not be consumed even in dev mode; run is alert-only.
      expect(proc.exitCode).toBe(0);
      expect(out).toContain("legacy unbound archive ignored");
      expect(out).not.toContain("999999");
    } finally {
      sb.cleanup();
    }
  });
});
