import { describe, expect, test } from "bun:test";
import { analyzePath, isDiagnostic } from "../../src/internal/path";

describe("analyzePath()", () => {
  test("extracts literal param names in order", () => {
    const result = analyzePath("/users/:userId/posts/:postId");
    expect(isDiagnostic(result)).toBe(false);
    expect((result as { paramNames: string[] }).paramNames).toEqual(["userId", "postId"]);
  });

  test("accepts static, wildcard-final, and root paths", () => {
    for (const path of ["/", "/health", "/files/*"]) {
      expect(isDiagnostic(analyzePath(path))).toBe(false);
    }
  });

  test("rejects missing leading slash", () => {
    expect(isDiagnostic(analyzePath("users/:id"))).toBe(true);
  });

  test("rejects duplicate param names", () => {
    expect(isDiagnostic(analyzePath("/a/:id/b/:id"))).toBe(true);
  });

  test("rejects malformed or empty param tokens", () => {
    expect(isDiagnostic(analyzePath("/a/:"))).toBe(true);
    expect(isDiagnostic(analyzePath("/a/:bad-name"))).toBe(true);
  });

  test("rejects non-final or embedded wildcards", () => {
    expect(isDiagnostic(analyzePath("/a/*/b"))).toBe(true);
    expect(isDiagnostic(analyzePath("/a/b*c"))).toBe(true);
  });
});
