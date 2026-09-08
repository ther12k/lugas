/**
 * M7-005 — prebuilt browser artifact checks (ADR-0021).
 *
 * Deterministic, no browser required:
 * 1. reproducibility: two builds from the same sources produce identical bytes;
 * 2. graph check: the artifact contains no server-runtime references
 *    (node:, Bun global, defineApp, src/core) — the shipped artifact, not
 *    just a source-graph scan;
 * 3. execution: the artifact runs standalone under Node (fetch stub), the
 *    same environment class as the release rehearsal's consumer.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildBrowserClient, ARTIFACT_FILE_NAME } from "../../scripts/release/build-browser-client";

const FORBIDDEN = [
  /node:/,
  /\bBun\./,
  /from\s*["']bun["']/,
  /require\(\s*["']bun["']\s*\)/,
  /\bdefineApp\b/,
  /src\/core\//,
];

describe("M7-005 prebuilt browser artifact", () => {
  test("build is reproducible from the same sources", async () => {
    const outA = mkdtempSync(join(tmpdir(), "lugas-artifact-a-"));
    const outB = mkdtempSync(join(tmpdir(), "lugas-artifact-b-"));
    try {
      const a = await buildBrowserClient(outA);
      const b = await buildBrowserClient(outB);
      expect(a.sha256).toBe(b.sha256);
      expect(a.bytes).toBe(b.bytes);
      expect(a.bytes).toBeGreaterThan(0);
    } finally {
      rmSync(outA, { recursive: true, force: true });
      rmSync(outB, { recursive: true, force: true });
    }
  });

  test("artifact graph check: no server-runtime references in shipped bytes", async () => {
    const out = mkdtempSync(join(tmpdir(), "lugas-artifact-graph-"));
    try {
      await buildBrowserClient(out);
      const text = await Bun.file(join(out, ARTIFACT_FILE_NAME)).text();
      for (const pattern of FORBIDDEN) {
        expect({ pattern: String(pattern), found: pattern.test(text) }).toEqual({
          pattern: String(pattern),
          found: false,
        });
      }
      // The artifact is the client surface, by exports.
      expect(text).toContain("class ClientDecodeError");
      expect(text).toContain("createClient");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("artifact executes standalone under Node (no Bun global)", async () => {
    const node = Bun.which("node");
    if (node === null) {
      console.warn("[m7-005] node unavailable; artifact execution smoke skipped");
      return;
    }
    const out = mkdtempSync(join(tmpdir(), "lugas-artifact-node-"));
    try {
      await buildBrowserClient(out);
      const entry = join(out, "node-smoke.mjs");
      await Bun.write(
        entry,
        `globalThis.fetch = async () => new Response("{}");
const m = await import("./${ARTIFACT_FILE_NAME}");
if (typeof m.createClient !== "function") throw new Error("missing createClient");
const c = m.createClient({ baseUrl: "https://x.test" });
if (typeof c.get !== "function") throw new Error("bad client");
const r = await c.get("/anything").catch((e) => ({ transportRejected: e instanceof Error }));
console.log("ARTIFACT-NODE-OK " + (r.transportRejected === true || r.ok === true));
`,
      );
      try {
        const runner = Bun.spawnSync(["node", entry], { cwd: out, stdout: "pipe", stderr: "pipe" });
        expect({
          code: runner.exitCode,
          stdout: new TextDecoder().decode(runner.stdout).trim(),
          stderr: new TextDecoder().decode(runner.stderr).trim(),
        }).toEqual({ code: 0, stdout: "ARTIFACT-NODE-OK true", stderr: "" });
      } catch (error) {
        if ((error as { code?: string }).code === "ENOENT") {
          console.warn("[m7-005] node unavailable; artifact execution smoke skipped");
          return;
        }
        throw error;
      }
      void readdirSync;
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
