import { describe, expect, test } from "bun:test";
import { route } from "../../src/core/route";

describe("route() local invariants", () => {
  test("creates a descriptor from a minimal handler config", () => {
    const descriptor = route({ handler: () => new Response("ok") });
    expect(typeof descriptor.handler).toBe("function");
    expect(Array.isArray(descriptor.before)).toBe(true);
  });

  test("rejects missing handler", () => {
    expect(() => route({} as never)).toThrow(/handler/);
  });

  test("rejects non-function handler", () => {
    expect(() => route({ handler: 42 } as never)).toThrow(/handler/);
  });

  test("rejects unknown config keys", () => {
    expect(() => route({ handler: () => new Response(), traslate: 1 } as never)).toThrow(/traslate/);
  });

  test("descriptor payload is frozen", () => {
    const descriptor = route({ handler: () => new Response() });
    expect(Object.isFrozen(descriptor)).toBe(true);
  });

  test("sync handler stays sync through the descriptor", () => {
    const descriptor = route({ handler: () => new Response("sync") });
    const out = descriptor.handler({ request: new Request("http://x/"), services: undefined as never, params: {} });
    expect(out).toBeInstanceOf(Response);
  });
});
