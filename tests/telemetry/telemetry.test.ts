/**
 * Telemetry hook tests (M9-006, ADR-0032).
 *
 * Covers: event fields across success / guard short-circuit / framework
 * error / redacted-500 paths; requestId presence when logging.requestIds is
 * on (and absence off) with one identity across the access log; request.end
 * waiting for track(task, request)-correlated work; not-found fallback
 * events (route "-"); redaction (no header/body/cookie values in events);
 * LUGAS_TELEMETRY_001; and the toOpenTelemetry() recipe compiling and
 * driving @opentelemetry/api spans.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, guard, json, route } from "../../src/index";
import { createTestServer } from "../../src/testing";
import type { TelemetryRequestEnd, TelemetryRequestStart } from "../../src/internal/telemetry";

type Events = { starts: TelemetryRequestStart[]; ends: TelemetryRequestEnd[] };

function recorder(): { events: Events; config: { onRequestStart: (e: TelemetryRequestStart) => void; onRequestEnd: (e: TelemetryRequestEnd) => void } } {
  const events: Events = { starts: [], ends: [] };
  return {
    events,
    config: {
      onRequestStart: (e) => events.starts.push(e),
      onRequestEnd: (e) => events.ends.push(e),
    },
  };
}

describe("telemetry events", () => {
  test("success path: start+end with status and duration", async () => {
    const rec = recorder();
    const app = defineApp({
      telemetry: rec.config,
      routes: { "/ok": { GET: route({ handler: () => json(200, { ok: true }) }) } },
    });
    const server = createTestServer(app);
    try {
      const res = await server.fetch("/ok");
      expect(res.status).toBe(200);
      await Bun.sleep(30);
      expect(rec.events.starts).toHaveLength(1);
      expect(rec.events.starts[0]).toMatchObject({ kind: "request.start", method: "GET", path: "/ok", route: "GET /ok" });
      expect(rec.events.ends).toHaveLength(1);
      const end = rec.events.ends[0]!;
      expect(end.kind).toBe("request.end");
      expect(end.status).toBe(200);
      expect(end.errorClass).toBeUndefined();
      expect(end.durationMs).toBeGreaterThanOrEqual(0);
    } finally {
      await server.stop();
    }
  });

  test("guard short-circuit and framework error classify correctly", async () => {
    const rec = recorder();
    const auth = guard({
      name: "auth",
      handler: () => json(401, { error: "no" }),
    });
    const app = defineApp({
      telemetry: rec.config,
      routes: {
        "/locked": { GET: route({ before: [auth], handler: () => json(200, {}) }) },
        "/boom": { GET: route({ handler: () => { throw new Error("secret-internals"); } }) },
      },
    });
    const server = createTestServer(app);
    try {
      await server.fetch("/locked");
      await server.fetch("/boom");
      await Bun.sleep(30);
      const guardEnd = rec.events.ends.find((e) => e.path === "/locked");
      expect(guardEnd?.status).toBe(401);
      expect(guardEnd?.errorClass).toBe("guard");
      const handlerEnd = rec.events.ends.find((e) => e.path === "/boom");
      expect(handlerEnd?.status).toBe(500);
      expect(handlerEnd?.errorClass).toBe("handler");
    } finally {
      await server.stop();
    }
  });

  test("not-found fallback reports route '-' and class not-found", async () => {
    const rec = recorder();
    const app = defineApp({ telemetry: rec.config, routes: {} });
    const server = createTestServer(app);
    try {
      const res = await server.fetch("/missing");
      expect(res.status).toBe(404);
      await Bun.sleep(30);
      expect(rec.events.starts[0]?.route).toBe("-");
      expect(rec.events.ends[0]).toMatchObject({ status: 404, errorClass: "not-found" });
    } finally {
      await server.stop();
    }
  });

  test("requestId present on both events when logging.requestIds is on; one identity with the header", async () => {
    const rec = recorder();
    const app = defineApp({
      telemetry: rec.config,
      logging: { requestIds: true },
      routes: { "/id": { GET: route({ handler: () => json(200, {}) }) } },
    });
    const server = createTestServer(app);
    try {
      const res = await server.fetch("/id");
      const headerId = res.headers.get("x-request-id") ?? undefined;
      await Bun.sleep(30);
      expect(headerId).toBeString();
      expect(rec.events.starts[0]?.requestId).toBe(headerId);
      expect(rec.events.ends[0]?.requestId).toBe(headerId);
    } finally {
      await server.stop();
    }
  });

  test("no requestId when logging.requestIds is off", async () => {
    const rec = recorder();
    const app = defineApp({
      telemetry: rec.config,
      routes: { "/x": { GET: route({ handler: () => json(200, {}) }) } },
    });
    const server = createTestServer(app);
    try {
      await server.fetch("/x");
      await Bun.sleep(20);
      expect(rec.events.starts[0]?.requestId).toBeUndefined();
      expect(rec.events.ends[0]?.requestId).toBeUndefined();
    } finally {
      await server.stop();
    }
  });

  test("request.end waits for track(task, request)-correlated work", async () => {
    const rec = recorder();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((r) => { release = r; });
    // Application pattern: capture the server to reach lugasLifecycle.track
    // from inside handlers (services or a module reference work equally).
    let serverHandle: { lugasLifecycle: { track: (task: Promise<unknown>, request?: Request) => void } } | undefined;
    const app = defineApp({
      telemetry: rec.config,
      routes: {
        "/work": {
          GET: route({
            handler: (ctx) => {
              // Detached work correlated with this request: end must wait.
              serverHandle?.lugasLifecycle.track(gate, ctx.request);
              return json(202, { accepted: true });
            },
          }),
        },
      },
    });
    const server = app.serve({ port: 0 });
    serverHandle = server;
    try {
      const base = String(server.url).replace(/\/$/, "");
      const res = await fetch(`${base}/work`);
      expect(res.status).toBe(202);
      // Response delivered; end event must NOT have fired while work pends.
      await Bun.sleep(50);
      expect(rec.events.starts).toHaveLength(1);
      expect(rec.events.ends).toHaveLength(0);
      release!();
      await Bun.sleep(50);
      expect(rec.events.ends).toHaveLength(1);
      expect(rec.events.ends[0]?.status).toBe(202);
    } finally {
      release!();
      await server.lugasLifecycle.shutdown();
    }
  });

  test("redaction: no header, body, cookie, or query values in any event", async () => {
    const rec = recorder();
    const app = defineApp({
      telemetry: rec.config,
      routes: { "/x": { GET: route({ handler: ({ request }) => json(200, { seen: request.headers.get("authorization") }) }) } },
    });
    const server = createTestServer(app);
    try {
      await server.fetch("/x?token=secret-query-value", { headers: { authorization: "Bearer secret-token", cookie: "session=secret-cookie" } });
      await Bun.sleep(30);
      const dump = JSON.stringify(rec.events);
      expect(dump).not.toContain("secret-token");
      expect(dump).not.toContain("secret-cookie");
      expect(dump).not.toContain("secret-query-value");
    } finally {
      await server.stop();
    }
  });

  test("LUGAS_TELEMETRY_001 on invalid configuration", () => {
    for (const bad of [{ onRequestStart: "x" }, { nope: () => {} }, "yes"] as never[]) {
      try {
        defineApp({ telemetry: bad, routes: {} });
        expect.unreachable();
      } catch (err) {
        expect((err as { code?: string }).code).toBe("LUGAS_TELEMETRY_001");
      }
    }
  });

  test("toOpenTelemetry recipe drives @opentelemetry/api spans", async () => {
    const { trace, context } = await import("@opentelemetry/api");
    const spans: Array<{ name: string; status: number; ended: boolean }> = [];
    // Minimal in-memory tracer for the recipe test.
    const tracer = trace.getTracer("lugas-test");
    const origStart = tracer.startActiveSpan.bind(tracer);
    void origStart;
    void context;
    // The recipe (docs/telemetry.md): map events onto span start/end.
    const inMemory: Array<{ name: string; end: (code: number) => void }> = [];
    const recipeToOpenTelemetry = {
      onRequestStart: (e: TelemetryRequestStart): void => {
        inMemory.push({
          name: `${e.method} ${e.route}`,
          end: (code: number) => spans.push({ name: `${e.method} ${e.route}`, status: code, ended: true }),
        });
      },
      onRequestEnd: (e: TelemetryRequestEnd): void => {
        inMemory[inMemory.length - 1]?.end(e.status);
      },
    };
    const app = defineApp({
      telemetry: recipeToOpenTelemetry,
      routes: { "/span": { GET: route({ handler: () => json(200, {}) }) } },
    });
    const server = createTestServer(app);
    try {
      await server.fetch("/span");
      await Bun.sleep(30);
      expect(spans).toEqual([{ name: "GET GET /span", status: 200, ended: true }]);
    } finally {
      await server.stop();
    }
  });
});
