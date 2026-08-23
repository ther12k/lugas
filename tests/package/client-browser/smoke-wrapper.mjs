/**
 * Bun-absent execution smoke (M3-014).
 *
 * Executed under standalone Node (`node smoke-wrapper.mjs`) so the bundled
 * client artifact runs in a standards-compatible environment that never had
 * a `Bun` global. Fails loudly if Bun is somehow present.
 */
import { readFileSync } from "node:fs";

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
