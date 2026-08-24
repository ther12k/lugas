/**
 * CLI inspection tests (M4-011).
 *
 * Tests the safe-import loader and human/JSON rendering through subprocess
 * isolation, matching the M4-010 spike contract.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadAppManifest } from "../../src/cli/load-app";

const SRC_INDEX_PATH = resolve(import.meta.dir, "../../src/index");
const SRC_INDEX = JSON.stringify(SRC_INDEX_PATH);

function makeFixture(code: string): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "lugas-cli-test-"));
  const path = join(dir, "app.ts");
  // Replace the relative import with an absolute one so /tmp fixtures resolve.
  const resolved = code.replace("__SRC_INDEX__", SRC_INDEX);
  writeFileSync(path, resolved);
  return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe("loadAppManifest()", () => {
  test("clean app with default export returns valid manifest", () => {
    const fixture = makeFixture(`
      import { defineApp } from __SRC_INDEX__;
      export default defineApp({
        routes: {
          "/ping": { GET: () => new Response("pong") },
          "/data/:id": { DELETE: () => new Response(null, { status: 204 }) },
        },
      });
    `);
    try {
      const result = loadAppManifest(fixture.path);
      if (!result.ok) console.error("loadApp failed:", result.message);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const manifest = JSON.parse(result.manifestJson) as Record<string, unknown>;
        expect(manifest.format).toBe("lugas-manifest-v1");
        expect(Array.isArray(manifest.routes)).toBe(true);
        expect((manifest.routes as unknown[]).length).toBe(2);
      }
    } finally {
      fixture.cleanup();
    }
  });

  test("named export app resolves via mod.app", () => {
    const fixture = makeFixture(`
      import { defineApp } from __SRC_INDEX__;
      export const app = defineApp({
        routes: { "/only": { GET: () => new Response("x") } },
      });
    `);
    try {
      const result = loadAppManifest(fixture.path);
      if (!result.ok) console.error("loadApp failed:", result.message);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const manifest = JSON.parse(result.manifestJson);
        expect(manifest.routes).toHaveLength(1);
      }
    } finally {
      fixture.cleanup();
    }
  });

  test("module without Lugas app export exits with code 3", () => {
    const fixture = makeFixture(`export default "not-an-app";`);
    try {
      const result = loadAppManifest(fixture.path);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.exitCode).toBe(3);
        expect(result.message).toContain("no Lugas app");
      }
    } finally {
      fixture.cleanup();
    }
  });

  test("import error produces exit code 1 with message", () => {
    const fixture = makeFixture(`throw new Error("intentional crash");`);
    try {
      const result = loadAppManifest(fixture.path);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.exitCode).toBe(1);
        expect(result.message).toContain("intentional crash");
      }
    } finally {
      fixture.cleanup();
    }
  });

  test("nonexistent file produces exit code 1", () => {
    const result = loadAppManifest("/tmp/nonexistent-lugas-app-xyz.ts");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.exitCode).toBe(1);
    }
  });
});
