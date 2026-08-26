/**
 * Shared path validation between declaration sites (M6R1-011).
 *
 * Both defineApp() and defineModule() must enforce the same route-path
 * syntax rules via the canonical analyzer, raising the stable
 * LUGAS_ROUTES_004 diagnostic (a LugasDiagnosticError, not a plain Error).
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";

describe("shared path validation (M6R1-011)", () => {
  test("defineApp rejects a non-'/' path with LUGAS_ROUTES_004 diagnostic", () => {
    try {
      defineApp({ routes: { "users": { GET: () => new Response("x") } } as never });
      expect.unreachable();
    } catch (error) {
      expect((error as { name?: string }).name).toBe("LugasDiagnosticError");
      expect((error as { code?: string }).code).toBe("LUGAS_ROUTES_004");
    }
  });

  test("defineApp rejects duplicate params with LUGAS_ROUTES_004", () => {
    expect(() =>
      defineApp({ routes: { "/x/:id/:id": { GET: () => new Response("x") } } as never }),
    ).toThrow(/duplicate param/);
  });

  test("defineApp rejects a mid-path wildcard", () => {
    expect(() =>
      defineApp({ routes: { "/x/*/y": { GET: () => new Response("x") } } as never }),
    ).toThrow(/wildcard/);
  });

  test("defineModule rejects a non-'/' path with LUGAS_ROUTES_004", () => {
    try {
      defineModule({ name: "m", routes: { "nope": { GET: () => new Response("x") } } as never });
      expect.unreachable();
    } catch (error) {
      expect((error as { name?: string }).name).toBe("LugasDiagnosticError");
      expect((error as { code?: string }).code).toBe("LUGAS_ROUTES_004");
    }
  });

  test("defineModule rejects malformed param tokens", () => {
    expect(() =>
      defineModule({ name: "m", routes: { "/inv/:bad-token!": { GET: () => new Response("x") } } as never }),
    ).toThrow(/invalid param token/);
  });

  test("valid paths still pass at both sites", () => {
    expect(() =>
      defineModule({
        name: "ok",
        routes: { "/ok/:id/*": { GET: () => new Response("x") } },
      }),
    ).not.toThrow();
    expect(() =>
      defineApp({ routes: { "/ok/:id": { GET: () => new Response("x") } } }),
    ).not.toThrow();
  });
});
