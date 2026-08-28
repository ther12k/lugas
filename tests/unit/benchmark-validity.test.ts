/**
 * Benchmark validity regression tests (M6R2 #281).
 *
 * Ensures benchmark evidence can only come from contract-satisfying
 * responses: status and body-marker assertions abort evidence generation,
 * and runner failures produce nonzero exits.
 */
import { describe, expect, test } from "bun:test";
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

describe("runner failure semantics (M6R2 #281)", () => {
  test("both runners install a nonzero-exit catch handler", () => {
    const plain = readFileSync(resolve(ROOT, "scripts/benchmark-plain.ts"), "utf8");
    const validated = readFileSync(resolve(ROOT, "scripts/benchmark-validated.ts"), "utf8");
    for (const [name, src] of [["plain", plain], ["validated", validated]] as const) {
      expect(src.includes("process.exitCode = 1"), `${name} nonzero exit`).toBe(true);
      // import-guard keeps tests importable without triggering a full run
      expect(src.includes("if (import.meta.main)"), `${name} import guard`).toBe(true);
    }
  });

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
