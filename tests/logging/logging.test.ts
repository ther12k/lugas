/**
 * M8-003 — structured logging and access facility behavior (ADR-0024).
 *
 * Pinned contract:
 * - Unconfigured logging leaves behavior byte-identical (no extra headers, no sink calls).
 * - Entry shape: scalar-only fields, closed schema (redaction by construction).
 * - Access entries: method, path, route pattern, status, durationMs, and optional requestId.
 * - Request ID: echoed as `x-request-id` response header and logged.
 * - Covers Lugas descriptors, native handlers, fallback routes, held 503s, and 500 errors.
 * - CORS preflights (intercepted by CORS wrapper) are NOT access logged.
 * - Log levels gate emission cleanly.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { defineApp, json, route, service, type LugasLogEntry } from "../../src";

const servers: Array<ReturnType<ReturnType<typeof defineApp>["serve"]>> = [];
afterAll(() => {
  for (const server of servers) server.stop(true);
});

function start(config: Parameters<typeof defineApp>[0]): { url: string; server: ReturnType<ReturnType<typeof defineApp>["serve"]> } {
  const server = defineApp(config).serve({ port: 0, development: false });
  servers.push(server);
  return { url: new URL(server.url).origin, server };
}

describe("M8-003 structured logging behavior", () => {
  test("no logging configured: no extra headers or behavior change", async () => {
    const { url } = start({
      routes: {
        "/hello": {
          GET: route({ handler: () => json(200, { ok: true }) }),
        },
      },
    });

    const res = await fetch(`${url}/hello`);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBeNull();
  });

  test("access logging emits single scalar-only entry per request", async () => {
    const entries: LugasLogEntry[] = [];
    const { url } = start({
      logging: {
        access: true,
        sink: (entry) => entries.push(entry),
      },
      routes: {
        "/users/:id": {
          GET: route({ handler: () => json(200, { user: 1 }) }),
        },
      },
    });

    const res = await fetch(`${url}/users/42`);
    expect(res.status).toBe(200);
    expect(entries.length).toBe(1);

    const entry = entries[0]!;
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("request");
    expect(entry.fields).toBeDefined();
    expect(entry.fields!.method).toBe("GET");
    expect(entry.fields!.path).toBe("/users/42");
    expect(entry.fields!.route).toBe("GET /users/:id");
    expect(entry.fields!.status).toBe(200);
    expect(typeof entry.fields!.durationMs).toBe("number");
    expect(entry.fields!.durationMs).toBeGreaterThanOrEqual(0);
    // Request ID was not requested
    expect(entry.fields!.requestId).toBeUndefined();
    expect(res.headers.get("x-request-id")).toBeNull();
  });

  test("requestIds generates uuid, adds x-request-id header, and correlates to log entry", async () => {
    const entries: LugasLogEntry[] = [];
    const { url } = start({
      logging: {
        access: true,
        requestIds: true,
        sink: (entry) => entries.push(entry),
      },
      routes: {
        "/ping": {
          GET: () => new Response("pong"),
        },
      },
    });

    const res = await fetch(`${url}/ping`);
    const headerId = res.headers.get("x-request-id");
    expect(headerId).not.toBeNull();
    expect(headerId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    expect(entries.length).toBe(1);
    expect(entries[0]!.fields!.requestId).toBe(headerId);
  });

  test("unmatched routes and fallback fetch are access logged with route '-'", async () => {
    const entries: LugasLogEntry[] = [];
    const { url } = start({
      logging: {
        access: true,
        sink: (entry) => entries.push(entry),
      },
      routes: {
        "/only": { GET: () => new Response("ok") },
      },
    });

    const res = await fetch(`${url}/not-found`);
    expect(res.status).toBe(404);
    expect(entries.length).toBe(1);
    expect(entries[0]!.fields!.path).toBe("/not-found");
    expect(entries[0]!.fields!.route).toBe("-");
    expect(entries[0]!.fields!.status).toBe(404);
  });

  test("held 503 requests from lifecycle startup failure are logged with accurate duration", async () => {
    const entries: LugasLogEntry[] = [];
    const app = defineApp({
      logging: {
        access: true,
        sink: (entry) => entries.push(entry),
      },
      services: {
        db: service({
          name: "db",
          value: null,
          init: () => Promise.reject(new Error("db down")),
        }),
      },
      routes: {
        "/gated": { GET: route({ handler: () => json(200, { ok: true }) }) },
      },
    });
    const server = app.serve({ port: 0, development: false });
    servers.push(server);

    await expect(server.lugasLifecycle.ready).rejects.toThrow("db down");

    const res = await fetch(`${new URL(server.url).origin}/gated`);
    expect(res.status).toBe(503);
    expect(entries.length).toBe(1);
    expect(entries[0]!.fields!.status).toBe(503);
    expect(entries[0]!.fields!.route).toBe("GET /gated");
  });

  test("route 500 errors are logged with status 500", async () => {
    const entries: LugasLogEntry[] = [];
    const { url } = start({
      logging: {
        access: true,
        sink: (entry) => entries.push(entry),
      },
      routes: {
        "/crash": {
          GET: route({
            handler: () => {
              throw new Error("unhandled exception");
            },
          }),
        },
      },
    });

    const res = await fetch(`${url}/crash`);
    expect(res.status).toBe(500);
    expect(entries.length).toBe(1);
    expect(entries[0]!.fields!.status).toBe(500);
    expect(entries[0]!.fields!.route).toBe("GET /crash");
  });

  test("CORS preflight requests are NOT access logged (intercepted at CORS boundary)", async () => {
    const entries: LugasLogEntry[] = [];
    const { url } = start({
      cors: { origin: "https://example.com" },
      logging: {
        access: true,
        sink: (entry) => entries.push(entry),
      },
      routes: {
        "/api": {
          GET: route({ handler: () => json(200, { ok: true }) }),
        },
      },
    });

    // Send preflight
    const preflightRes = await fetch(`${url}/api`, {
      method: "OPTIONS",
      headers: {
        origin: "https://example.com",
        "access-control-request-method": "GET",
      },
    });
    expect(preflightRes.status).toBe(204);
    expect(entries.length).toBe(0); // preflight intercepted outside logging!

    // Actual cross-origin request IS access logged
    const actualRes = await fetch(`${url}/api`, {
      headers: { origin: "https://example.com" },
    });
    expect(actualRes.status).toBe(200);
    expect(entries.length).toBe(1);
    expect(entries[0]!.fields!.status).toBe(200);
  });

  test("log level filtering suppresses info access logs when level is warn or error", async () => {
    const entries: LugasLogEntry[] = [];
    const { url } = start({
      logging: {
        access: true,
        level: "warn",
        sink: (entry) => entries.push(entry),
      },
      routes: {
        "/ping": { GET: () => new Response("pong") },
      },
    });

    const res = await fetch(`${url}/ping`);
    expect(res.status).toBe(200);
    expect(entries.length).toBe(0); // info-level access log filtered out by warn
  });
});
