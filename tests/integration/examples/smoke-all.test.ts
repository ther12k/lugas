/**
 * Example smoke gate (CA-25): runs every example's smoke script
 * sequentially (drizzle's walkthrough uses the hardcoded port 3000, so
 * parallelism is off) and requires the `-SMOKE-OK` line from each.
 * The client example keeps its own integration coverage
 * (tests/integration/server-client/); spa-starter is covered by its
 * `bun run verify` suite instead.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const SMOKES = [
  "basic",
  "validation",
  "auth",
  "proof-api",
  "realworld",
  "cookies",
  "uploads",
  "compression",
  "rate-limit",
  "telemetry",
  "production",
  "websockets",
  "drizzle",
  "static",
] as const;

describe("examples smoke suite (CA-25)", () => {
  for (const name of SMOKES) {
    test(`${name} smoke prints ${name}-SMOKE-OK`, async () => {
      const proc = Bun.spawn([process.execPath, join("examples", name, "smoke.ts")], {
        cwd: REPO_ROOT,
        stdout: "pipe",
        stderr: "pipe",
      });
      const [out, err] = await Promise.all([
        new Response(proc.stdout as ReadableStream).text(),
        new Response(proc.stderr as ReadableStream).text(),
      ]);
      const code = await proc.exited;
      expect(code, `${name} smoke exit (stderr: ${err.slice(0, 400)})`).toBe(0);
      expect(out).toContain(`${name}-SMOKE-OK`);
    }, 120_000);
  }
});
