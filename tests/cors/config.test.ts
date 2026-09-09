/**
 * M8-001 — CORS configuration diagnostics (ADR-0022).
 *
 * Pinned contract: invalid configuration fails closed at `defineApp()` with
 * stable `LUGAS_CORS_*` codes; credentials never combine with wildcard
 * origins; pipeline-bypass route kinds (static `Response`, `Bun.file`,
 * `{ dir }`) and `assets` are rejected when `cors` is configured instead of
 * serving un-policy'd responses.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, route } from "../../src";
import type { CorsConfig } from "../../src";

function expectCode(config: Record<string, unknown>, code: string): void {
  try {
    defineApp(config as never);
  } catch (error) {
    expect((error as { code?: string }).code).toBe(code);
    return;
  }
  throw new Error(`expected defineApp() to throw ${code}`);
}

const okRoute = (): { GET: ReturnType<typeof route> } => ({
  GET: route({ handler: () => new Response("ok") }),
});

describe("M8-001 CORS configuration diagnostics", () => {
  test("cors must be an object", () => {
    expectCode({ cors: "https://x.example.com", routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
    expectCode({ cors: null, routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
  });

  test("unknown cors keys are rejected", () => {
    expectCode({ cors: { origin: "*", bogus: 1 }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
  });

  test("invalid origin shapes are rejected (LUGAS_CORS_002)", () => {
    expectCode({ cors: { origin: 42 }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_002");
    expectCode({ cors: { origin: "" }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_002");
    expectCode({ cors: { origin: [] }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_002");
    expectCode({ cors: { origin: ["https://a.example.com", 7] }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_002");
    expectCode({ cors: { origin: ["*", "https://a.example.com"] }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_002");
    expectCode({ cors: {}, routes: { "/hi": okRoute() } }, "LUGAS_CORS_002");
  });

  test("credentials are incompatible with wildcard origins (LUGAS_CORS_003)", () => {
    expectCode({ cors: { origin: "*", credentials: true }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_003");
    expectCode({ cors: { origin: ["*"], credentials: true }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_003");
  });

  test("invalid methods, header lists, credentials, and maxAge are rejected (LUGAS_CORS_001)", () => {
    expectCode({ cors: { origin: "*", methods: [] }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
    expectCode({ cors: { origin: "*", methods: ["get"] }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
    expectCode({ cors: { origin: "*", methods: ["GET", "GET"] }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
    expectCode({ cors: { origin: "*", allowedHeaders: [] }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
    expectCode({ cors: { origin: "*", allowedHeaders: ["X Y"] }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
    expectCode({ cors: { origin: "*", allowedHeaders: ["X-A", "x-a"] }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
    expectCode({ cors: { origin: "*", exposedHeaders: ["bad name"] }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
    expectCode({ cors: { origin: "*", credentials: "yes" }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
    expectCode({ cors: { origin: "*", maxAge: -1 }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
    expectCode({ cors: { origin: "*", maxAge: 1.5 }, routes: { "/hi": okRoute() } }, "LUGAS_CORS_001");
  });

  test("pipeline-bypass route kinds are rejected when cors is configured (LUGAS_CORS_004)", () => {
    expectCode(
      { cors: { origin: "*" }, routes: { "/static": new Response("body") } },
      "LUGAS_CORS_004",
    );
    expectCode(
      { cors: { origin: "*" }, routes: { "/file": Bun.file(import.meta.path.replace("config.test.ts", "cors.test.ts")) } },
      "LUGAS_CORS_004",
    );
    expectCode(
      { cors: { origin: "*" }, routes: { "/dir": { dir: "/tmp" } } },
      "LUGAS_CORS_004",
    );
    expectCode(
      { cors: { origin: "*" }, routes: { "/mixed": { GET: okRoute().GET, POST: new Response("body") } } },
      "LUGAS_CORS_004",
    );
    expectCode(
      { cors: { origin: "*" }, routes: { "/hi": okRoute() }, assets: { files: { "/robots.txt": "./README.md" } } },
      "LUGAS_CORS_004",
    );
  });

  test("wildcard-alone array and minimal configs compile (accepted forms)", () => {
    expect(() => defineApp({ cors: { origin: ["*"] }, routes: { "/hi": okRoute() } })).not.toThrow();
    expect(() => defineApp({ cors: { origin: () => true }, routes: { "/hi": okRoute() } })).not.toThrow();
    const config: CorsConfig = { origin: "*", methods: ["GET"], allowedHeaders: ["Content-Type"], exposedHeaders: ["X-Request-Id"], maxAge: 0 };
    expect(() => defineApp({ cors: config, routes: { "/hi": okRoute() } })).not.toThrow();
  });
});
