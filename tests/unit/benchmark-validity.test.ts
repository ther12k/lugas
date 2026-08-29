/**
 * Benchmark validity regression tests (M6R2 #281).
 *
 * Ensures benchmark evidence can only come from contract-satisfying
 * responses: status and body-marker assertions abort evidence generation,
 * and runner failures produce nonzero exits.
 */
import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assertContract } from "../../scripts/benchmark-plain";

const ROOT = resolve(import.meta.dir, "../..");

describe("benchmark response contracts (M6R2 #281)", () => {
  test("matching status+body passes", async () => {
    const res = new Response('{"ok":true}', { status: 200 });
    await expect(assertContract(res, { status: 200, bodyIncludes: "ok" })).resolves.toBeUndefined();
  });

  test("wrong status is rejected", async () => {
    const res = new Response("not found", { status: 404 });
    await expect(
      assertContract(res, { status: 200, bodyIncludes: "static" }),
    ).rejects.toThrow(/status 404 != 200/);
  });

  test("missing body marker is rejected", async () => {
    const res = new Response("totally different", { status: 200 });
    await expect(
      assertContract(res, { status: 200, bodyIncludes: "static" }),
    ).rejects.toThrow(/body missing/);
  });
});

describe("runner failure semantics (M6R2 #281, M6R6.1 #311)", () => {
  test("all three runners install a nonzero-exit catch handler", () => {
    const plain = readFileSync(resolve(ROOT, "scripts/benchmark-plain.ts"), "utf8");
    const validated = readFileSync(resolve(ROOT, "scripts/benchmark-validated.ts"), "utf8");
    const client = readFileSync(resolve(ROOT, "scripts/benchmark-client-types.ts"), "utf8");
    for (const [name, src] of [["plain", plain], ["validated", validated], ["client", client]] as const) {
      expect(src.includes("process.exitCode = 1"), `${name} nonzero exit`).toBe(true);
      // import-guard keeps tests importable without triggering a full run
      expect(src.includes("if (import.meta.main)"), `${name} import guard`).toBe(true);
    }
  });

  test("client runner fails with nonzero exit when the bundle build breaks (M6R6.1 #311)", () => {
    // Sabotage via sandbox: point the bundle entry at a missing file. Before
    // #311 the catch printed the error but exited 0, letting `set -e` flows
    // continue toward the release gate with stale archives.
    const dir = mkdtempSync(join(tmpdir(), "lugas-client-sabotage-"));
    try {
      const srcPath = resolve(ROOT, "scripts/benchmark-client-types.ts");
      const src = readFileSync(srcPath, "utf8").replace(
        "tests/package/client-browser/browser-fixture.ts",
        "tests/package/client-browser/does-not-exist.ts",
      );
      expect(src).not.toContain("browser-fixture.ts");
      writeFileSync(join(dir, "sabotaged-client.ts"), src);
      const proc = Bun.spawnSync(["bun", "run", join(dir, "sabotaged-client.ts")], {
        cwd: ROOT,
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(proc.exitCode, "sabotaged client runner must exit nonzero").not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  test("client runner archives the v2 candidate binding and is self-restoring (M6R6.1 #311)", () => {
    const archive = resolve(ROOT, "benchmarks/results/m5-client-types/smoke.json");
    const resultsArchive = resolve(ROOT, "benchmarks/results/m5-client-types/results.json");
    const snapshot = existsSync(archive) ? readFileSync(archive) : null;
    const resultsSnapshot = existsSync(resultsArchive) ? readFileSync(resultsArchive) : null;
    try {
      const proc = Bun.spawnSync(["bun", "run", resolve(ROOT, "scripts/benchmark-client-types.ts"), "--smoke"], {
        cwd: ROOT,
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(proc.exitCode, "client runner exit").toBe(0);
      const written = JSON.parse(readFileSync(archive, "utf8")) as {
        format?: string;
        env?: { commit?: string; bunVersion?: string; platform?: string; arch?: string; cpuModel?: string };
        bundle?: { rawBytes?: number };
      };
      expect(written.format).toBe("lugas-client-benchmark-v2");
      expect(written.env?.commit).toBe(execSync("git rev-parse HEAD", { encoding: "utf8" }).trim());
      expect(written.env?.bunVersion).toBe(process.versions.bun);
      expect(written.env?.platform).toBe(process.platform);
      expect(written.env?.arch).toBe(process.arch);
      expect(typeof written.env?.cpuModel).toBe("string");
      expect(typeof written.bundle?.rawBytes).toBe("number");
      expect(written.bundle!.rawBytes!).toBeGreaterThan(0);
    } finally {
      if (snapshot === null) rmSync(archive, { force: true });
      else if (existsSync(archive)) writeFileSync(archive, snapshot);
      if (resultsSnapshot === null) rmSync(resultsArchive, { force: true });
      else if (existsSync(resultsArchive)) writeFileSync(resultsArchive, resultsSnapshot);
    }
  }, 180_000);

  test("plain runner fails with nonzero exit when a scenario violates its contract", () => {
    // Sabotage via sandbox: patch expectation inside a temp copy of the runner.
    const dir = mkdtempSync(join(tmpdir(), "lugas-bench-sabotage-"));
    try {
      const srcPath = resolve(ROOT, "scripts/benchmark-plain.ts");
      let src = readFileSync(srcPath, "utf8");
      src = src.replace('{ status: 200, bodyIncludes: "static" }', '{ status: 299, bodyIncludes: "nope" }');
      writeFileSync(join(dir, "sabotaged.ts"), src);
      const proc = Bun.spawnSync(["bun", "run", join(dir, "sabotaged.ts")], {
        cwd: ROOT,
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, BENCH_DURATION_MS: "150", LUGAS_BENCH_NO_ARCHIVE: "1" },
      });
      const err = new TextDecoder().decode(proc.stderr);
      expect(proc.exitCode).not.toBe(0);
      expect(err).toContain("benchmark contract violated");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  test("healthy short smoke of both runners completes green WITHOUT polluting archives", () => {
    // Snapshot any pre-existing archives so the check is self-contained.
    const plainArchive = resolve(ROOT, "benchmarks/results/m5-plain/results.json");
    const validatedArchive = resolve(ROOT, "benchmarks/results/m5-validated/results.json");
    const preExisting = {
      plain: existsSync(plainArchive) ? readFileSync(plainArchive) : null,
      validated: existsSync(validatedArchive) ? readFileSync(validatedArchive) : null,
    };

    try {
      for (const script of ["benchmark-plain.ts", "benchmark-validated.ts"]) {
        const proc = Bun.spawnSync(["bun", "run", resolve(ROOT, "scripts", script)], {
          cwd: ROOT,
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, BENCH_DURATION_MS: "120", LUGAS_BENCH_NO_ARCHIVE: "1" },
        });
        expect(proc.exitCode, `${script} exit`).toBe(0);
      }

      // Smoke runs must not write or modify archives: 120ms samples would
      // poison the perf gate with non-representative data on slow machines.
      if (preExisting.plain === null) {
        expect(existsSync(plainArchive), "plain archive created by smoke").toBe(false);
      } else {
        expect(readFileSync(plainArchive).equals(preExisting.plain), "plain archive mutated").toBe(true);
      }
      if (preExisting.validated === null) {
        expect(existsSync(validatedArchive), "validated archive created by smoke").toBe(false);
      } else {
        expect(readFileSync(validatedArchive).equals(preExisting.validated), "validated archive mutated").toBe(true);
      }
    } finally {
      // True self-restoration (#M6R3): a violation that CREATED an archive is
      // removed; a violation that OVERWROTE an existing archive has its exact
      // snapshot bytes written back — the failure path is precisely when
      // test isolation matters most.
      if (preExisting.plain === null) {
        rmSync(plainArchive, { force: true });
      } else if (existsSync(plainArchive)) {
        writeFileSync(plainArchive, preExisting.plain);
      }
      if (preExisting.validated === null) {
        rmSync(validatedArchive, { force: true });
      } else if (existsSync(validatedArchive)) {
        writeFileSync(validatedArchive, preExisting.validated);
      }
    }
  }, 120_000);
});
