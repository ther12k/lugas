/**
 * Shared environment for the M7-005 browser lane (ADR-0021).
 *
 * Capability model, mirroring the npm-gated suites: when no Chromium-family
 * browser is available the real-browser stages skip with a recorded warning;
 * setting LUGAS_REQUIRE_BROWSER=1 turns the missing capability into a
 * failure instead, so a CI lane that claims browser coverage cannot satisfy
 * itself silently.
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { findBrowserExecutable, type BrowserLaunch } from "./cdp";

export const ROOT = resolve(import.meta.dir, "..", "..");

const executable = findBrowserExecutable();
export const browserAvailable = executable !== null;

if (!browserAvailable && process.env.LUGAS_REQUIRE_BROWSER === "1") {
  throw new Error("LUGAS_REQUIRE_BROWSER=1 but no Chromium-family browser executable was found");
}

export function requireBrowser(): string {
  if (executable === null) {
    throw new Error("no browser executable available");
  }
  return executable;
}

export type { BrowserLaunch };
export { existsSync };
