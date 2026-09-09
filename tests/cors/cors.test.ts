/**
 * M8-001 — first-party CORS policy behavior (ADR-0022).
 *
 * Pinned contract: absent `cors` leaves behavior byte-identical (no header
 * changes, raw fallback semantics); when configured, every response carries
 * `Vary: Origin` (merged, never duplicated), allowed origins receive
 * `Access-Control-*` headers on actual responses, preflights are answered
 * `204` before application handlers (deny = `Vary` only), enforcement covers
 * Lugas descriptors, native function handlers, any-method entries, the
 * not-found fallback, error responses, and traffic-gate `503`s.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { defineApp, defineModule, json, route, service, text } from "../../src";

const ALLOWED = "https://app.example.com";
const OTHER = "https://other.example.net";

const servers: Array<ReturnType<ReturnType<typeof defineApp>["serve"]>> = [];
afterAll(() => {
  for (const server of servers) server.stop(true);
});

function start(config: Parameters<typeof defineApp>[0]): string {
  const app = defineApp(config);
  const server = app.serve({ port: 0, development: false });
  servers.push(server);
  return new URL(server.url).origin;
}

const get = (base: string, path: string, origin?: string): Promise<Response> =>
  fetch(base + path, origin !== undefined ? { headers: { origin } } : {});

const preflight = (
  base: string,
  path: string,
  options: { origin?: string; method?: string; requestHeaders?: string } = {},
): Promise<Response> =>
  fetch(base + path, {
    method: "OPTIONS",
    headers: {
      ...(options.origin !== undefined ? { origin: options.origin } : {}),
      ...(options.method !== undefined ? { "access-control-request-method": options.method } : {}),
      ...(options.requestHeaders !== undefined ? { "access-control-request-headers": options.requestHeaders } : {}),
    },
  });

const cors = { origin: ALLOWED } as const;

describe("M8-001 CORS behavior", () => {
  test("no cors configuration: no Vary, no Access-Control headers, preflight keeps raw fallback semantics", async () => {
    const base = start({
      routes: {
        "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) },
        "/native": { GET: () => new Response("native") },
      },
    });
    const response = await get(base, "/hi", ALLOWED);
    expect(response.status).toBe(200);
    expect(response.headers.get("vary")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    const native = await get(base, "/native", ALLOWED);
    expect(native.headers.get("vary")).toBeNull();
    // Preflight on a path without OPTIONS: fallback not-found, untouched.
    const pre = await preflight(base, "/hi", { origin: ALLOWED, method: "GET" });
    expect(pre.status).toBe(404);
    expect(pre.headers.get("access-control-allow-origin")).toBeNull();
  });

  test("single allowed origin: echoed on actual responses with Vary: Origin", async () => {
    const base = start({
      cors,
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const response = await get(base, "/hi", ALLOWED);
    expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED);
    expect(response.headers.get("vary")).toBe("Origin");
  });

  test("denied origin and absent origin: no Access-Control headers, Vary: Origin still present", async () => {
    const base = start({
      cors,
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const denied = await get(base, "/hi", OTHER);
    expect(denied.status).toBe(200);
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
    expect(denied.headers.get("vary")).toBe("Origin");
    const sameOrigin = await get(base, "/hi");
    expect(sameOrigin.headers.get("access-control-allow-origin")).toBeNull();
    expect(sameOrigin.headers.get("vary")).toBe("Origin");
  });

  test("allowlist array: each listed origin allowed, unknown denied", async () => {
    const base = start({
      cors: { origin: [ALLOWED, "https://second.example.org"] },
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    expect((await get(base, "/hi", "https://second.example.org")).headers.get("access-control-allow-origin")).toBe("https://second.example.org");
    expect((await get(base, "/hi", OTHER)).headers.get("access-control-allow-origin")).toBeNull();
  });

  test("wildcard origin: ACAO '*' without credentials header", async () => {
    const base = start({
      cors: { origin: "*" },
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const response = await get(base, "/hi", OTHER);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("vary")).toBe("Origin");
  });

  test("credentials: true: allow-credentials on actual responses and preflights", async () => {
    const base = start({
      cors: { origin: [ALLOWED], credentials: true },
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const response = await get(base, "/hi", ALLOWED);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    const pre = await preflight(base, "/hi", { origin: ALLOWED, method: "GET" });
    expect(pre.headers.get("access-control-allow-credentials")).toBe("true");
  });

  test("origin callbacks: sync boolean, async canonical string echo, false denies", async () => {
    const base = start({
      cors: {
        origin: (originValue: string) => originValue.endsWith(".example.com"),
      },
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    expect((await get(base, "/hi", "https://api.example.com")).headers.get("access-control-allow-origin")).toBe("https://api.example.com");
    expect((await get(base, "/hi", "https://example.net")).headers.get("access-control-allow-origin")).toBeNull();

    const canonicalBase = start({
      cors: {
        origin: async () => "https://canonical.example.com",
      },
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    expect((await get(canonicalBase, "/hi", ALLOWED)).headers.get("access-control-allow-origin")).toBe("https://canonical.example.com");
  });

  test("callback returning '*' under credentials is denied at runtime (fail closed)", async () => {
    const base = start({
      cors: { origin: () => "*", credentials: true },
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const response = await get(base, "/hi", ALLOWED);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("vary")).toBe("Origin");
  });

  test("preflight allowed: 204 with echo, default methods set, reflected request headers, Vary", async () => {
    const base = start({
      cors,
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const pre = await preflight(base, "/hi", { origin: ALLOWED, method: "POST", requestHeaders: "content-type, x-request-id" });
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe(ALLOWED);
    expect(pre.headers.get("access-control-allow-methods")).toBe("GET, HEAD, POST, PUT, PATCH, DELETE");
    expect(pre.headers.get("access-control-allow-headers")).toBe("content-type, x-request-id");
    expect(pre.headers.get("vary")).toContain("Origin");
  });

  test("preflight maxAge and configured allowedHeaders gating", async () => {
    const base = start({
      cors: { origin: ALLOWED, allowedHeaders: ["Content-Type", "X-Request-Id"], maxAge: 600 },
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const ok = await preflight(base, "/hi", { origin: ALLOWED, method: "POST", requestHeaders: "content-type" });
    expect(ok.headers.get("access-control-allow-headers")).toBe("Content-Type, X-Request-Id");
    expect(ok.headers.get("access-control-max-age")).toBe("600");
    // Case-insensitive subset check.
    const cased = await preflight(base, "/hi", { origin: ALLOWED, method: "POST", requestHeaders: "CONTENT-TYPE" });
    expect(cased.headers.get("access-control-allow-origin")).toBe(ALLOWED);
    // A requested header outside the configured set denies the preflight.
    const denied = await preflight(base, "/hi", { origin: ALLOWED, method: "POST", requestHeaders: "x-custom" });
    expect(denied.status).toBe(204);
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
    expect(denied.headers.get("vary")).toContain("Origin");
  });

  test("preflight denied origin or method: 204 with Vary only (no partial authorization)", async () => {
    const base = start({
      cors: { origin: ALLOWED, methods: ["GET"] },
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const deniedOrigin = await preflight(base, "/hi", { origin: OTHER, method: "GET" });
    expect(deniedOrigin.status).toBe(204);
    expect(deniedOrigin.headers.get("access-control-allow-origin")).toBeNull();
    const deniedMethod = await preflight(base, "/hi", { origin: ALLOWED, method: "DELETE" });
    expect(deniedMethod.status).toBe(204);
    expect(deniedMethod.headers.get("access-control-allow-origin")).toBeNull();
    expect(deniedMethod.headers.get("access-control-allow-methods")).toBeNull();
  });

  test("preflight is intercepted before a declared OPTIONS handler; plain OPTIONS passes through with headers", async () => {
    let plainOptionsCalls = 0;
    const base = start({
      cors,
      routes: {
        "/opt": {
          GET: route({ handler: () => json(200, { ok: true }) }),
          OPTIONS: route({ handler: () => { plainOptionsCalls += 1; return text(200, "user-options"); } }),
        },
      },
    });
    const pre = await preflight(base, "/opt", { origin: ALLOWED, method: "GET" });
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe(ALLOWED);
    expect(plainOptionsCalls).toBe(0);
    const plain = await fetch(base + "/opt", { method: "OPTIONS", headers: { origin: ALLOWED } });
    expect(await plain.text()).toBe("user-options");
    expect(plainOptionsCalls).toBe(1);
    expect(plain.headers.get("access-control-allow-origin")).toBe(ALLOWED);
    expect(plain.headers.get("vary")).toBe("Origin");
  });

  test("any-method path-level functions: preflight intercepted, actual responses carry headers", async () => {
    const base = start({
      cors,
      routes: { "/any": (request: Request) => new Response(`any:${request.method}`) },
    });
    const pre = await preflight(base, "/any", { origin: ALLOWED, method: "POST" });
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe(ALLOWED);
    const response = await get(base, "/any", ALLOWED);
    expect(await response.text()).toBe("any:GET");
    expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED);
  });

  test("native function handlers in method maps carry the policy", async () => {
    const base = start({
      cors,
      routes: {
        "/native": {
          GET: () => new Response("native-get"),
          POST: () => new Response("native-post"),
        },
      },
    });
    const response = await fetch(base + "/native", { method: "POST", headers: { origin: ALLOWED } });
    expect(await response.text()).toBe("native-post");
    expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED);
    expect(response.headers.get("vary")).toBe("Origin");
  });

  test("not-found fallback: Vary always; Access-Control-Allow-Origin for allowed origins; undeclared-path preflight answered", async () => {
    const base = start({
      cors,
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const allowed = await get(base, "/missing", ALLOWED);
    expect(allowed.status).toBe(404);
    expect(allowed.headers.get("access-control-allow-origin")).toBe(ALLOWED);
    expect(allowed.headers.get("vary")).toBe("Origin");
    const denied = await get(base, "/missing", OTHER);
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
    expect(denied.headers.get("vary")).toBe("Origin");
    const pre = await preflight(base, "/missing", { origin: ALLOWED, method: "GET" });
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe(ALLOWED);
  });

  test("Vary merging: handler-set Vary is preserved without duplication", async () => {
    const base = start({
      cors,
      routes: {
        "/vary": {
          GET: () => new Response("v", { headers: { Vary: "Accept-Encoding" } }),
        },
        "/vary-origin": {
          GET: () => new Response("v", { headers: { Vary: "Origin" } }),
        },
      },
    });
    const merged = await get(base, "/vary", ALLOWED);
    expect(merged.headers.get("vary")).toBe("Accept-Encoding, Origin");
    const existing = await get(base, "/vary-origin", ALLOWED);
    expect(existing.headers.get("vary")).toBe("Origin");
  });

  test("error responses keep the policy: onError 500 and traffic-gate 503 carry Vary and ACAO", async () => {
    const base = start({
      cors,
      routes: {
        "/boom": { GET: route({ handler: () => { throw new Error("boom"); } }) },
      },
    });
    const errored = await get(base, "/boom", ALLOWED);
    expect(errored.status).toBe(500);
    expect(errored.headers.get("vary")).toBe("Origin");
    expect(errored.headers.get("access-control-allow-origin")).toBe(ALLOWED);

    const gatedApp = defineApp({
      cors,
      services: { svc: service({ name: "svc", value: 1, init: () => Promise.reject(new Error("init failed")) }) },
      routes: { "/gated": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const gated = gatedApp.serve({ port: 0, development: false });
    servers.push(gated);
    await expect(gated.lugasLifecycle.ready).rejects.toThrow("init failed");
    const held = await fetch(`${new URL(gated.url).origin}/gated`, { headers: { origin: ALLOWED } });
    expect(held.status).toBe(503);
    expect(held.headers.get("vary")).toBe("Origin");
    expect(held.headers.get("access-control-allow-origin")).toBe(ALLOWED);
  });

  test("HEAD (auto-derived from GET) carries the policy headers", async () => {
    const base = start({
      cors,
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const response = await fetch(base + "/hi", { method: "HEAD", headers: { origin: ALLOWED } });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED);
  });

  test("exposedHeaders appear on actual responses, not on preflights", async () => {
    const base = start({
      cors: { origin: ALLOWED, exposedHeaders: ["X-Request-Id"] },
      routes: { "/hi": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const response = await get(base, "/hi", ALLOWED);
    expect(response.headers.get("access-control-expose-headers")).toBe("X-Request-Id");
    const pre = await preflight(base, "/hi", { origin: ALLOWED, method: "GET" });
    expect(pre.headers.get("access-control-expose-headers")).toBeNull();
  });

  test("module routes receive the same policy", async () => {
    const base = start({
      cors,
      modules: [
        defineModule({
          name: "invoices",
          routes: {
            "/invoices": { GET: route({ handler: () => json(200, { n: 1 }) }) },
          },
        }),
      ],
    });
    const response = await get(base, "/invoices", ALLOWED);
    expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED);
  });
});
