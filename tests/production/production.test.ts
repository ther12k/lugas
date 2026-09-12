/**
 * Production-hardening tests (M9-004, ADR-0029).
 *
 * secureHeaders: defaults on pipeline responses, fill-if-absent (handler
 * header wins), opt-in CSP/HSTS, config diagnostics, no headers without
 * the config. health: liveness 200 during init while ordinary routes are
 * held 503, readiness 503→200 flip after init, 503 after startup failure,
 * path renames, collisions (LUGAS_HEALTH_002), invalid config
 * (LUGAS_HEALTH_001/LUGAS_HEADERS_001), manifest facts, CORS composition.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { defineApp, json, route, service } from "../../src/index";
import { createTestServer } from "../../src/testing";

describe("secureHeaders", () => {
  test("no policy headers without the config", async () => {
    const app = defineApp({
      routes: { "/x": { GET: route({ handler: () => json(200, {}) }) } },
    });
    const server = createTestServer(app);
    try {
      const res = await server.fetch("/x");
      expect(res.headers.get("x-content-type-options")).toBeNull();
      expect(res.headers.get("x-frame-options")).toBeNull();
      expect(res.headers.get("referrer-policy")).toBeNull();
    } finally {
      await server.stop();
    }
  });

  test("defaults present on route responses and not-found fallbacks", async () => {
    const app = defineApp({
      secureHeaders: true,
      routes: { "/x": { GET: route({ handler: () => json(200, {}) }) } },
    });
    const server = createTestServer(app);
    try {
      for (const res of [await server.fetch("/x"), await server.fetch("/nope")]) {
        expect(res.headers.get("x-content-type-options")).toBe("nosniff");
        expect(res.headers.get("x-frame-options")).toBe("deny");
        expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
      }
    } finally {
      await server.stop();
    }
  });

  test("static method-map entries survive the secure-headers pass (CA-1)", async () => {
    const app = defineApp({
      secureHeaders: true,
      routes: {
        "/api": { GET: route({ handler: () => json(200, {}) }) },
        "/native": { GET: Bun.file(join(import.meta.dir, "fixtures", "note.txt")) },
      },
      assets: { files: { "/logo.svg": join(import.meta.dir, "fixtures", "logo.svg") } },
    });
    const routes = app.prepared.bunRoutes as Record<string, Record<string, unknown>>;
    expect(routes["/native"]?.GET).toBeInstanceOf(Blob);
    expect(routes["/logo.svg"]?.GET).toBeInstanceOf(Blob);
    const server = createTestServer(app);
    try {
      const native = await server.fetch("/native");
      expect(native.status).toBe(200);
      expect(await native.text()).toContain("native note body");
      const asset = await server.fetch("/logo.svg");
      expect(asset.status).toBe(200);
      expect(await asset.text()).toContain("<svg");
      const wrapped = await server.fetch("/api");
      expect(wrapped.status).toBe(200);
      expect(wrapped.headers.get("x-content-type-options")).toBe("nosniff");
    } finally {
      await server.stop();
    }
  });

  test("fill-if-absent: handler-set header wins; policy fills gaps", async () => {
    const app = defineApp({
      secureHeaders: true,
      routes: {
        "/x": {
          GET: route({
            handler: () => json(200, {}, { headers: { "x-frame-options": "sameorigin" } }),
          }),
        },
      },
    });
    const server = createTestServer(app);
    try {
      const res = await server.fetch("/x");
      expect(res.headers.get("x-frame-options")).toBe("sameorigin");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    } finally {
      await server.stop();
    }
  });

  test("opt-in CSP and HSTS emitted exactly; absent by default", async () => {
    const withOpts = defineApp({
      secureHeaders: { contentSecurityPolicy: "default-src 'self'", hstsMaxAge: 31536000 },
      routes: { "/x": { GET: route({ handler: () => json(200, {}) }) } },
    });
    const server = createTestServer(withOpts);
    try {
      const res = await server.fetch("/x");
      expect(res.headers.get("content-security-policy")).toBe("default-src 'self'");
      expect(res.headers.get("strict-transport-security")).toBe("max-age=31536000");
      expect(res.headers.get("x-frame-options")).toBe("deny");
    } finally {
      await server.stop();
    }
  });

  test("plain secureHeaders: true emits no CSP or HSTS", async () => {
    const app = defineApp({
      secureHeaders: true,
      routes: { "/x": { GET: route({ handler: () => json(200, {}) }) } },
    });
    const server = createTestServer(app);
    try {
      const res = await server.fetch("/x");
      expect(res.headers.get("content-security-policy")).toBeNull();
      expect(res.headers.get("strict-transport-security")).toBeNull();
    } finally {
      await server.stop();
    }
  });

  test("LUGAS_HEADERS_001 on invalid configuration", () => {
    for (const bad of [
      { contentSecurityPolicy: "" },
      { contentSecurityPolicy: 5 },
      { hstsMaxAge: 0 },
      { hstsMaxAge: 1.5 },
      "yes",
    ] as never[]) {
      try {
        defineApp({ secureHeaders: bad, routes: {} });
        expect.unreachable();
      } catch (err) {
        expect((err as { code?: string }).code).toBe("LUGAS_HEADERS_001");
      }
    }
  });
});

describe("health endpoints", () => {
  test("liveness 200 during init while ordinary routes are held 503; readiness flips after", async () => {
    let releaseInit: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseInit = resolve;
    });
    const app = defineApp({
      health: true,
      services: {
        slow: service({
          name: "slow",
          value: {},
          init: async () => {
            await gate;
          },
        }),
      },
      routes: {
        "/data": { GET: route({ handler: () => json(200, {}) }) },
      },
    });
    const server = app.serve({ port: 0 });
    const base = String(server.url).replace(/\/$/, "");
    try {
      // During init: liveness answers 200, readiness 503; the ordinary route
      // is held (its fetch stays pending until init settles).
      const liveness = await fetch(`${base}/health`);
      expect(liveness.status).toBe(200);
      expect(await liveness.json()).toEqual({ status: "ok" });
      const readiness = await fetch(`${base}/ready`);
      expect(readiness.status).toBe(503);
      expect(await readiness.json()).toEqual({ status: "unavailable" });
      const held = fetch(`${base}/data`);
      held.then((r) => expect(r.status).toBe(200));

      releaseInit!();
      expect((await held).status).toBe(200);
      await Bun.sleep(20);
      const after = await fetch(`${base}/ready`);
      expect(after.status).toBe(200);
      expect(await after.json()).toEqual({ status: "ready" });
    } finally {
      releaseInit!();
      await server.lugasLifecycle.shutdown();
    }
  });

  test("startup failure keeps readiness at 503", async () => {
    const app = defineApp({
      health: true,
      services: {
        broken: service({
          name: "broken",
          value: {},
          init: async () => {
            throw new Error("db down");
          },
        }),
      },
      routes: { "/x": { GET: route({ handler: () => json(200, {}) }) } },
    });
    const server = app.serve({ port: 0 });
    server.lugasLifecycle.ready.catch(() => {}); // startup failure surfaces here; the test asserts the endpoints
    const base = String(server.url).replace(/\/$/, "");
    try {
      await Bun.sleep(30);
      const ready = await fetch(`${base}/ready`);
      expect(ready.status).toBe(503);
      expect(await ready.json()).toEqual({ status: "unavailable" });
      const live = await fetch(`${base}/health`);
      expect(live.status).toBe(200);
    } finally {
      await server.lugasLifecycle.shutdown();
    }
  });

  test("path renames work", async () => {
    const app = defineApp({
      health: { livenessPath: "/healthz", readinessPath: "/readyz" },
      routes: {},
    });
    const server = createTestServer(app);
    try {
      expect((await server.fetch("/healthz")).status).toBe(200);
      expect((await server.fetch("/readyz")).status).toBe(200);
      expect((await server.fetch("/health")).status).toBe(404);
    } finally {
      await server.stop();
    }
  });

  test("LUGAS_HEALTH_002 on collision with a route or asset", () => {
    expect(() =>
      defineApp({ health: true, routes: { "/health": { GET: route({ handler: () => json(200, {}) }) } } }),
    ).toThrow();
    try {
      defineApp({ health: true, routes: { "/ready": { GET: route({ handler: () => json(200, {}) }) } } });
      expect.unreachable();
    } catch (err) {
      expect((err as { code?: string }).code).toBe("LUGAS_HEALTH_002");
    }
    expect(() =>
      defineApp({
        health: true,
        assets: { files: { "/health": "./public/x.txt" } },
        routes: {},
      }),
    ).toThrow();
  });

  test("LUGAS_HEALTH_001 on invalid configuration", () => {
    for (const bad of [{ livenessPath: "nope" }, { readinessPath: "*" }, { livenessPath: "/same", readinessPath: "/same" }, "yes"] as never[]) {
      try {
        defineApp({ health: bad, routes: {} });
        expect.unreachable();
      } catch (err) {
        expect((err as { code?: string }).code).toBe("LUGAS_HEALTH_001");
      }
    }
  });

  test("manifest lists health endpoints; CORS composes with the policy", async () => {
    const app = defineApp({
      health: true,
      secureHeaders: true,
      cors: { origin: "https://app.example" },
      routes: { "/x": { GET: route({ handler: () => json(200, {}) }) } },
    });
    const paths = (app.manifest.routes as ReadonlyArray<{ path: string; method: string }>).map((r) => r.path);
    expect(paths).toContain("/health");
    expect(paths).toContain("/ready");
    const server = createTestServer(app);
    try {
      const res = await server.fetch("/health", { headers: { origin: "https://app.example" } });
      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBe("https://app.example");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    } finally {
      await server.stop();
    }
  });
});
