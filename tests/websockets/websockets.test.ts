/**
 * WebSocket route tests (M9-003, ADR-0028).
 *
 * Covers: guard short-circuit rejecting the handshake with a real HTTP
 * response, pre-upgrade schema validation (422), honest 426 for
 * non-upgrade requests, typed context (params/query/guard enrichment)
 * across open/message/close, multi-route multiplexing through the single
 * Bun handler, shutdown close-1001, manifest facts, and both diagnostics.
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { defineApp, guard, json, websocket } from "../../src/index";
import { createTestServer } from "../../src/testing";

function connect(url: string, headers?: Record<string, string>): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: headers as never });
    const timer = setTimeout(() => reject(new Error("ws open timeout")), 3000);
    ws.onopen = () => {
      clearTimeout(timer);
      resolve(ws);
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("ws error before open"));
    };
    ws.onclose = (event) => {
      clearTimeout(timer);
      reject(new Error(`closed before open: ${event.code} ${event.reason}`));
    };
  });
}

function nextMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("ws message timeout")), 3000);
    ws.onmessage = (event) => {
      clearTimeout(timer);
      resolve(typeof event.data === "string" ? event.data : String(event.data));
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("ws error awaiting message"));
    };
  });
}

function nextClose(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    ws.onclose = (event) => resolve({ code: event.code, reason: event.reason });
  });
}

describe("websocket() config validation", () => {
  test("LUGAS_WS_001 on missing message", () => {
    try {
      websocket({} as never);
      expect.unreachable();
    } catch (err) {
      expect((err as { code?: string }).code).toBe("LUGAS_WS_001");
    }
  });

  test("LUGAS_WS_001 on unknown key", () => {
    expect(() => websocket({ message: () => {}, handlers: {} } as never)).toThrow();
  });

  test("LUGAS_WS_001 on malformed guards", () => {
    expect(() => websocket({ message: () => {}, before: [{ name: 5 }] } as never)).toThrow();
    expect(() => websocket({ message: () => {}, before: "auth" } as never)).toThrow();
  });

  test("accepts a minimal descriptor", () => {
    expect(() => websocket({ message: () => {} })).not.toThrow();
  });
});

describe("upgrade decisions over HTTP", () => {
  test("guard short-circuit rejects the handshake with a real 401", async () => {
    const auth = guard({
      name: "auth",
      handler: ({ request }) => {
        return request.headers.get("authorization") !== null ? { user: "usr_1" } : json(401, { error: "unauthorized" });
      },
    });
    const app = defineApp({
      routes: {
        "/ws": {
          GET: websocket({
            before: [auth],
            message: () => {},
          }),
        },
      },
    });
    const server = createTestServer(app);
    try {
      const denied = await server.fetch("/ws");
      expect(denied.status).toBe(401);
      expect(((await denied.json()) as { error: string }).error).toBe("unauthorized");
      // Guards passing but no upgrade headers → honest 426, never a hang.
      const allowed = await server.fetch("/ws", { headers: { authorization: "Bearer t" } });
      expect(allowed.status).toBe(426);
    } finally {
      await server.stop();
    }
  });

  test("query validation failure returns 422 before the upgrade decision", async () => {
    const app = defineApp({
      routes: {
        "/ws": {
          GET: websocket({
            query: z.object({ room: z.string().min(2) }),
            message: () => {},
          }),
        },
      },
    });
    const server = createTestServer(app);
    try {
      const invalid = await server.fetch("/ws?room=x");
      expect(invalid.status).toBe(422);
      const problem = (await invalid.json()) as { code: string };
      expect(problem.code).toBe("VALIDATION_FAILED");

      const valid = await server.fetch("/ws?room=lobby");
      expect(valid.status).toBe(426);
    } finally {
      await server.stop();
    }
  });
});

describe("socket lifecycle over a real server", () => {
  test("typed context across open/message/close with guard enrichment and params", async () => {
    let lastClose: { id: number; code: number; reason: string } | undefined;
    const auth = guard({
      name: "auth",
      handler: ({ request }) => {
        return request.headers.get("authorization") !== null ? { user: "usr_1" } : json(401, { error: "unauthorized" });
      },
    });
    const app = defineApp({
      routes: {
        "/rooms/:id": {
          GET: websocket({
            before: [auth],
            params: z.object({ id: z.coerce.number().int().positive() }),
            open: (ws, ctx) => ws.send(`open:${ctx.params.id}:${ctx.user}`),
            message: (ws, message, ctx) => ws.send(`echo:${ctx.user}:${message}`),
            close: (ws, code, reason, ctx) => {
              lastClose = { id: ctx.params.id, code, reason };
            },
          }),
        },
      },
    });
    const server = createTestServer(app);
    try {
      const ws = await connect(`${String(server.url).replace("http", "ws")}/rooms/7`, { authorization: "Bearer t" });
      expect(await nextMessage(ws)).toBe("open:7:usr_1");

      ws.send("hello");
      expect(await nextMessage(ws)).toBe("echo:usr_1:hello");

      const closed = nextClose(ws);
      ws.close(1000, "done");
      expect(await closed).toEqual({ code: 1000, reason: "done" });
      await Bun.sleep(50);
      expect(lastClose).toEqual({ id: 7, code: 1000, reason: "done" });
    } finally {
      await server.stop();
    }
  });

  test("two websocket routes multiplex through the single Bun handler", async () => {
    const app = defineApp({
      routes: {
        "/alpha": {
          GET: websocket({ message: (ws) => ws.send("alpha") }),
        },
        "/beta": {
          GET: websocket({ message: (ws) => ws.send("beta") }),
        },
      },
    });
    const server = createTestServer(app);
    try {
      const a = await connect(String(server.url).replace("http", "ws") + "/alpha");
      const b = await connect(String(server.url).replace("http", "ws") + "/beta");

      a.send("x");
      b.send("y");
      expect(await nextMessage(a)).toBe("alpha");
      expect(await nextMessage(b)).toBe("beta");

      a.close();
      b.close();
    } finally {
      await server.stop();
    }
  });

  test("shutdown closes open sockets with 1001 Going Away", async () => {
    let closeFromHandler: { code: number; reason: string } | undefined;
    const app = defineApp({
      routes: {
        "/ws": {
          GET: websocket({
            message: () => {},
            close: (_ws, code, reason) => {
              closeFromHandler = { code, reason };
            },
          }),
        },
      },
    });
    const server = app.serve({ port: 0 });
    await server.lugasLifecycle.ready;

    const ws = await connect(String(server.url).replace(/\/$/, "").replace("http", "ws") + "/ws");
    const closing = nextClose(ws);

    const outcome = await server.lugasLifecycle.shutdown("test");
    expect(outcome.connectionsClosed).toBe(true);

    const close = await closing;
    expect(close.code).toBe(1001);
    expect(close.reason).toBe("server shutting down");
    await Bun.sleep(30);
    expect(closeFromHandler).toEqual({ code: 1001, reason: "server shutting down" });
  });

  test("manifest records the websocket route at its path and method", () => {
    const app = defineApp({
      routes: {
        "/ws": {
          GET: websocket({
            before: [guard({ name: "auth", handler: ({ request }) => request })],
            message: () => {},
          }),
        },
      },
    });
    const route = (app.manifest.routes as unknown as ReadonlyArray<{ path: string; method: string; guards?: string[] }>).find(
      (r) => r.path === "/ws",
    );
    expect(route).toBeDefined();
    expect(route!.method).toBe("GET");
    expect(route!.guards).toEqual(["auth"]);
  });
});

describe("serve-time conflict", () => {
  test("LUGAS_WS_002 when serve() supplies its own websocket option", () => {
    const app = defineApp({
      routes: {
        "/ws": {
          GET: websocket({ message: () => {} }),
        },
      },
    });
    try {
      app.serve({ port: 0, websocket: { message: () => {} } } as never);
      expect.unreachable();
    } catch (err) {
      expect((err as { code?: string }).code).toBe("LUGAS_WS_002");
    }
  });
});
