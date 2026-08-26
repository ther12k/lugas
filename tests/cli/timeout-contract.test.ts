/**
 * CLI timeout contract tests (M6R1-007).
 *
 * - Timeout detection keys on Bun's `exitedDueToTimeout` (exit code 2),
 *   not a signal/exit-code heuristic.
 * - A hanging module yields exit code 2 with the timeout message.
 * - Invalid `--timeout` values are rejected with LUGAS_CLI_001 before any
 *   subprocess spawns: floats ("1.5"), zero, negatives, non-numeric.
 *
 * Note: only invalid values are exercised through main() — they throw in
 * parseArgs before reaching process.exit, so tests terminate normally.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadAppManifest } from "../../src/cli/load-app";
import { main } from "../../src/cli/main";

const ROOT = resolve(import.meta.dir, "../..");

function makeFixture(code: string): string {
  const dir = mkdtempSync(join(tmpdir(), "lugas-timeout-"));
  const path = join(dir, "app.ts");
  const srcIndex = JSON.stringify(resolve(ROOT, "src/index"));
  writeFileSync(path, code.replace("__SRC_INDEX__", srcIndex));
  return path;
}

describe("timeout detection via exitedDueToTimeout (M6R1-007)", () => {
  test("hanging module returns exit code 2 with timeout message", () => {
    const f = makeFixture(`
      import { defineApp } from __SRC_INDEX__;
      setInterval(() => {}, 1000);
      export default defineApp({ routes: { "/x": { GET: () => new Response("ok") } } });
    `);
    const r = loadAppManifest(f, { timeoutMs: 300 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.exitCode).toBe(2);
      expect(r.message).toContain("timed out after 300ms");
    }
  });

  test("clean module still succeeds (no false-positive timeout)", () => {
    const f = makeFixture(`
      import { defineApp } from __SRC_INDEX__;
      export default defineApp({ routes: { "/x": { GET: () => new Response("ok") } } });
    `);
    const r = loadAppManifest(f);
    expect(r.ok).toBe(true);
  });

  test("valid finite timeout still detects a hang (contract intact)", () => {
    const f = makeFixture(`
      import { defineApp } from __SRC_INDEX__;
      await Bun.sleep(30_000); // active timer keeps the subprocess alive
      export default defineApp({});
    `);
    const r = loadAppManifest(f, { timeoutMs: 250 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.exitCode).toBe(2);
  });
});

describe("--timeout input validation (M6R1-007)", () => {
  test("rejects floats, zero, negatives, non-numeric with LUGAS_CLI_001", () => {
    for (const bad of ["1.5", "0", "-100", "abc"]) {
      expect(() => main(["routes", "/dev/null", "--timeout", bad])).toThrow(/LUGAS_CLI_001/);
    }
  });
});
