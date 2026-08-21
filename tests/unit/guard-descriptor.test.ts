import { describe, expect, test } from "bun:test";
import { guard } from "../../src/core/guard";

describe("guard() descriptors", () => {
  test("creates a named frozen descriptor", () => {
    const g = guard({ name: "requireUser", handler: () => ({ actor: { id: "u1" } }) });
    expect(g.name).toBe("requireUser");
    expect(Object.isFrozen(g)).toBe(true);
  });

  test("rejects empty and whitespace names", () => {
    expect(() => guard({ name: "", handler: () => ({}) })).toThrow(/name/);
    expect(() => guard({ name: "   ", handler: () => ({}) })).toThrow(/name/);
  });

  test("rejects non-function handler", () => {
    expect(() => guard({ name: "x", handler: "nope" } as never)).toThrow(/handler/);
  });

  test("rejects unknown keys", () => {
    expect(() => guard({ name: "x", handler: () => ({}), nmae: "typo" } as never)).toThrow(/nmae/);
  });

  test("identity is preserved for manifest and diagnostics", () => {
    const g = guard({ name: "audit", handler: () => new Response(null, { status: 403 }) });
    expect(g.name).toBe("audit");
    expect(g.handler).toBeInstanceOf(Function);
  });
});
