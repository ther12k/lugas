/**
 * `lugas/testing` export and CLI packed consumer tests (M4-017).
 */
import { describe, expect, test } from "bun:test";

describe("lugas/testing subpath", () => {
  test("bare specifier resolves under Bun", async () => {
    const m = await import("lugas/testing");
    expect(typeof m.createTestServer).toBe("function");
  });

  test("internal modules are not exposed via testing subpath", async () => {
    let threw = false;
    try {
      // @ts-expect-error internal subpath intentionally locked down
      await import("lugas/testing/test-server");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
