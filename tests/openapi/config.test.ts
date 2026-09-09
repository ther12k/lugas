/**
 * M8-004 — OpenAPI configuration and path conflict diagnostics (ADR-0025).
 */
import { describe, expect, test } from "bun:test";
import { defineApp, route } from "../../src";

describe("M8-004 OpenAPI diagnostics", () => {
  test("invalid openapi configs throw LUGAS_OPENAPI_001", () => {
    const expectErr = (conf: unknown) => {
      expect(() => {
        defineApp({
          openapi: conf as never,
          routes: { "/ok": { GET: () => new Response("ok") } },
        });
      }).toThrow();

      try {
        defineApp({
          openapi: conf as never,
          routes: { "/ok": { GET: () => new Response("ok") } },
        });
      } catch (err) {
        const diag = err as { code?: string };
        expect(diag.code).toBe("LUGAS_OPENAPI_001");
      }
    };

    expectErr(null);
    expectErr("invalid");
    expectErr({ bogus: 1 });
    expectErr({ document: null });
    expectErr({ document: { title: "" } });
    expectErr({ document: { title: "OK", version: "" } });
    expectErr({ document: { title: "OK", version: "1" }, path: "invalid-path" });
    expectErr({ document: { title: "OK", version: "1" }, ui: { path: "no-leading-slash" } });
    expectErr({ document: { title: "OK", version: "1" }, path: "/same", ui: { path: "/same" } });
  });

  test("route or asset collisions throw LUGAS_OPENAPI_002", () => {
    // Collision with user API route
    expect(() => {
      defineApp({
        openapi: {
          document: { title: "Test", version: "1.0.0" },
          path: "/openapi.json",
        },
        routes: {
          "/openapi.json": {
            GET: route({ handler: () => new Response("user override") }),
          },
        },
      });
    }).toThrow();

    try {
      defineApp({
        openapi: {
          document: { title: "Test", version: "1.0.0" },
          path: "/openapi.json",
        },
        routes: {
          "/openapi.json": {
            GET: route({ handler: () => new Response("user override") }),
          },
        },
      });
    } catch (err) {
      const diag = err as { code?: string };
      expect(diag.code).toBe("LUGAS_OPENAPI_002");
    }

    // Collision with UI path
    try {
      defineApp({
        openapi: {
          document: { title: "Test", version: "1.0.0" },
          ui: { path: "/docs" },
        },
        routes: {
          "/docs": {
            GET: () => new Response("user docs"),
          },
        },
      });
    } catch (err) {
      const diag = err as { code?: string };
      expect(diag.code).toBe("LUGAS_OPENAPI_002");
    }
  });
});
