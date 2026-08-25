/**
 * Bun version check tests (M5R1-006 correction).
 */
import { describe, expect, test } from "bun:test";

describe("Bun 1.4 baseline check", () => {
  test("accepts 1.4.0", () => {
    // The function exits(1) on mismatch; if we get here without exit, it passed.
    const { checkBunVersion } = require("../../scripts/check-bun-version");
    expect(() => checkBunVersion("1.4.0")).not.toThrow();
  });

  test("accepts 1.4.x patch versions", () => {
    const { checkBunVersion } = require("../../scripts/check-bun-version");
    expect(() => checkBunVersion("1.4.5")).not.toThrow();
  });
});
