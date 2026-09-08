/**
 * Bun-absent execution smoke (M3-014).
 *
 * Executed under standalone Node (`node smoke-wrapper.mjs`) so the bundled
 * client artifact runs in a standards-compatible environment that never had
 * a `Bun` global. Fails loudly if Bun is somehow present.
 */
import { readFileSync } from "node:fs";

// `bun run` injects a PATH shim that resolves `node` to bun when no real
// node exists. Under that shim a Bun global is the environment, not a leak
// from the bundle — skip instead of failing (real-node machines and CI still
// execute the genuine check).
if ("Bun" in globalThis && process.versions?.bun) {
  console.log("SMOKE-SKIP: node resolved to the bun shim");
  process.exit(0);
}
if ("Bun" in globalThis) {
  console.error("SMOKE-FAIL: Bun global present in execution environment");
  process.exit(1);
}
const bundlePath = process.env.SMOKE_BUNDLE_PATH;
if (!bundlePath) {
  console.error("SMOKE-FAIL: SMOKE_BUNDLE_PATH not set");
  process.exit(1);
}
readFileSync(bundlePath, "utf8"); // artifact must exist and be readable
await import(bundlePath);
