import { describe, expect, test } from "bun:test";
import { defineApp, route, guard, service } from "../../src";
import { z } from "zod";

describe("Lifecycle Gate Fast Path Regressions (CA-16)", () => {
  // 1. Initialization Pending: No premature handler execution
  test("initialization pending: held requests do not execute until service init resolves", async () => {
    let initResolved = false;
    let resolveInit!: () => void;
    const initPromise = new Promise<void>((resolve) => {
      resolveInit = () => {
        initResolved = true;
        resolve();
      };
    });

    let handlerExecuted = false;
    const slowService = service({
      name: "slow",
      value: {},
      init: async () => {
        await initPromise;
      },
    });

    const app = defineApp({
      services: { slow: slowService },
      routes: {
        "/work": {
          GET: route({
            handler: () => {
              handlerExecuted = true;
              return Response.json({ ok: true });
            },
          }),
        },
      },
    });

    const server = app.serve({ port: 0, development: false });
    try {
      // Dispatch request while init is still pending
      const reqPromise = fetch(`${server.url.origin}/work`);

      // Verify that handler has NOT executed yet
      await new Promise((r) => setTimeout(r, 20));
      expect(handlerExecuted).toBe(false);
      expect(initResolved).toBe(false);

      // Now resolve initialization
      resolveInit();
      const res = await reqPromise;
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(handlerExecuted).toBe(true);
    } finally {
      await server.lugasLifecycle.shutdown("test");
    }
  });

  // 2. Initialization Rejected: Existing redacted 503 problem response
  test("initialization rejected: startup failure leaves trafficGate un-settled and answers held requests with redacted 503", async () => {
    let rejectInit!: (err: Error) => void;
    const initPromise = new Promise<void>((_, reject) => {
      rejectInit = (err) => reject(err);
    });

    const failingService = service({
      name: "failing",
      value: {},
      init: async () => {
        await initPromise;
      },
    });

    const app = defineApp({
      services: { fail: failingService },
      routes: {
        "/data": {
          GET: route({
            handler: () => Response.json({ secret: "should not leak" }),
          }),
        },
      },
    });

    const server = app.serve({ port: 0, development: false });
    try {
      const reqPromise = fetch(`${server.url.origin}/data`);
      await new Promise((r) => setTimeout(r, 20));

      // Reject initialization
      rejectInit(new Error("database unreachable"));
      const res = await reqPromise;
      expect(res.status).toBe(503);
      const body = (await res.json()) as { title?: string; status?: number; detail?: string };
      expect(body.title).toBe("unavailable");
      expect(body.status).toBe(503);
      expect(body.detail).toBe("service initialization did not complete");
      expect(JSON.stringify(body)).not.toContain("database unreachable");

      // Subsequent requests also receive 503
      const resAfter = await fetch(`${server.url.origin}/data`);
      expect(resAfter.status).toBe(503);
    } finally {
      await server.lugasLifecycle.shutdown("test");
    }
  });

  // 3. Initialization Successful: Synchronous and Asynchronous Handlers both work
  test("initialization successful: synchronous and asynchronous handlers execute cleanly on fast path", async () => {
    const app = defineApp({
      routes: {
        "/sync": {
          GET: route({
            handler: () => Response.json({ mode: "sync" }),
          }),
        },
        "/async": {
          GET: route({
            handler: async () => {
              await new Promise((r) => setTimeout(r, 5));
              return Response.json({ mode: "async" });
            },
          }),
        },
      },
    });

    const server = app.serve({ port: 0, development: false });
    try {
      // Traffic gate settled is true for sync app
      expect(app.prepared.trafficGate.settled).toBe(true);

      // Direct invocation assertion: invoking prepared handler for synchronous route
      // returns a Response directly, synchronously before any await (not a Promise).
      const syncHandler = (app.prepared.bunRoutes["/sync"] as Record<string, (req: Request) => Response | Promise<Response>>)["GET"]!;
      const directSyncResult = syncHandler(new Request("http://localhost/sync"));
      expect(directSyncResult).toBeInstanceOf(Response);
      expect(directSyncResult instanceof Promise).toBe(false);

      // Asynchronous route still returns a Promise
      const asyncHandler = (app.prepared.bunRoutes["/async"] as Record<string, (req: Request) => Response | Promise<Response>>)["GET"]!;
      const directAsyncResult = asyncHandler(new Request("http://localhost/async"));
      expect(directAsyncResult).toBeInstanceOf(Promise);

      const rSync = await fetch(`${server.url.origin}/sync`);
      expect(rSync.status).toBe(200);
      expect(await rSync.json()).toEqual({ mode: "sync" });

      const rAsync = await fetch(`${server.url.origin}/async`);
      expect(rAsync.status).toBe(200);
      expect(await rAsync.json()).toEqual({ mode: "async" });
    } finally {
      await server.lugasLifecycle.shutdown("test");
    }
  });

  test("synchronous direct-return holds after async service initialization completes", async () => {
    let resolveService!: () => void;
    const initPromise = new Promise<void>((resolve) => {
      resolveService = resolve;
    });

    const asyncService = service({
      name: "asyncSvc",
      value: {},
      init: async () => {
        await initPromise;
      },
    });

    const app = defineApp({
      services: { svc: asyncService },
      routes: {
        "/sync-after-init": {
          GET: route({
            handler: () => Response.json({ status: "settled" }),
          }),
        },
      },
    });

    const server = app.serve({ port: 0, development: false });
    try {
      const handler = (app.prepared.bunRoutes["/sync-after-init"] as Record<string, (req: Request) => Response | Promise<Response>>)["GET"]!;

      // While init is pending, handler returns a Promise (traffic gate is holding traffic)
      expect(app.prepared.trafficGate.settled).toBe(false);
      const pendingResult = handler(new Request("http://localhost/sync-after-init"));
      expect(pendingResult).toBeInstanceOf(Promise);

      // Settle service initialization
      resolveService();
      await server.lugasLifecycle.ready;
      expect(app.prepared.trafficGate.settled).toBe(true);

      // Once settled, invoking the synchronous handler returns Response directly, without Promise wrapper
      const settledResult = handler(new Request("http://localhost/sync-after-init"));
      expect(settledResult).toBeInstanceOf(Response);
      expect(settledResult instanceof Promise).toBe(false);
      expect(((settledResult as Response).status)).toBe(200);
    } finally {
      await server.lugasLifecycle.shutdown("test");
    }
  });

  // 4. Handler, Guard, and Error Policy Failures remain intact
  test("error handling: guards, validation, and error-policy failures remain properly caught and redacted", async () => {
    const authGuard = guard({
      name: "auth",
      handler: ({ request }) => {
        if (!request.headers.has("authorization")) {
          return Response.json({ error: "missing token" }, { status: 401 });
        }
        return { user: "test" };
      },
    });

    const throwingGuard = guard({
      name: "boom",
      handler: () => {
        throw new Error("guard explosion");
      },
    });

    const app = defineApp({
      routes: {
        "/guarded": {
          GET: route({
            before: [authGuard],
            handler: () => Response.json({ ok: true }),
          }),
        },
        "/guard-throw": {
          GET: route({
            before: [throwingGuard],
            handler: () => Response.json({ ok: true }),
          }),
        },
        "/validate": {
          POST: route({
            body: z.object({ count: z.number().min(1) }),
            handler: ({ body }) => Response.json(body),
          }),
        },
        "/handler-throw": {
          GET: route({
            handler: () => {
              throw new Error("handler internal explosion");
            },
          }),
        },
      },
    });

    const server = app.serve({ port: 0, development: false });
    try {
      // 4a. Guard short-circuit
      const rGuardFail = await fetch(`${server.url.origin}/guarded`);
      expect(rGuardFail.status).toBe(401);
      expect(await rGuardFail.json()).toEqual({ error: "missing token" });

      // 4b. Guard throwing -> redacted 500 problem
      const rGuardThrow = await fetch(`${server.url.origin}/guard-throw`);
      expect(rGuardThrow.status).toBe(500);
      const guardThrowBody = (await rGuardThrow.json()) as { title?: string };
      expect(guardThrowBody.title).toBe("Internal Server Error");
      expect(JSON.stringify(guardThrowBody)).not.toContain("guard explosion");

      // 4c. Validation rejection -> 422 problem details
      const rValFail = await fetch(`${server.url.origin}/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count: -5 }),
      });
      expect(rValFail.status).toBe(422);

      // 4d. Handler throw -> redacted 500 problem
      const rHandlerThrow = await fetch(`${server.url.origin}/handler-throw`);
      expect(rHandlerThrow.status).toBe(500);
      const handlerThrowBody = (await rHandlerThrow.json()) as { title?: string };
      expect(handlerThrowBody.title).toBe("Internal Server Error");
      expect(JSON.stringify(handlerThrowBody)).not.toContain("handler internal explosion");
    } finally {
      await server.lugasLifecycle.shutdown("test");
    }
  });

  // 5. Logging, Telemetry, and Shutdown Semantics
  test("observability and lifecycle: logging, telemetry hooks, and shutdown semantics work properly with fast path", async () => {
    const events: string[] = [];
    const logs: any[] = [];

    const app = defineApp({
      logging: {
        requestIds: true,
        access: true,
        sink: (entry) => {
          logs.push(entry);
        },
      },
      telemetry: {
        onRequestStart: ({ route, requestId }) => {
          events.push(`start:${route}:${Boolean(requestId && requestId.length > 0)}`);
        },
        onRequestEnd: ({ route, status }) => {
          events.push(`end:${route}:${status}`);
        },
      },
      routes: {
        "/ping": {
          GET: route({
            handler: () => Response.json({ pong: true }),
          }),
        },
      },
    });

    const server = app.serve({ port: 0, development: false });
    try {
      const res = await fetch(`${server.url.origin}/ping`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ pong: true });

      // Telemetry events captured
      expect(events.length).toBe(2);
      expect(events[0]).toContain("start:GET /ping:true");
      expect(events[1]).toBe("end:GET /ping:200");

      // Access log captured
      expect(logs.length).toBeGreaterThanOrEqual(1);
      const logEntry = logs[0]!;
      expect(logEntry.fields.status).toBe(200);
      expect(logEntry.fields.route).toBe("GET /ping");

      // Graceful shutdown cleans up and reports exit
      const outcome = await server.lugasLifecycle.shutdown("test");
      expect(outcome.cooperated).toBe(true);
      expect(outcome.deadlineExpired).toBe(false);
      expect(outcome.disposalFailures.length).toBe(0);
    } finally {
      server.stop(true);
    }
  });
});
