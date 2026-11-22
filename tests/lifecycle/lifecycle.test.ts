/**
 * M7-004 — application service lifecycle (ADR-0020).
 *
 * Covers the acceptance checklist: init order pre-traffic, startup-failure
 * rollback, graceful drain before disposal, the deadline invariant (resources
 * not closed underneath continuing work), outcome distinctness, idempotent
 * shutdown, tracked tasks, resource-count baseline, plain-service
 * compatibility, and opt-in signals.
 */
import { describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";
import { defineApp, json, route, service, websocket } from "../../src";
import type { LugasServer } from "../../src/internal/serve";
import type { ShutdownOutcome } from "../../src/internal/lifecycle";

const ROOT = resolve(import.meta.dir, "../..");

type Step = { readonly event: string; readonly name?: string };
const recorder = (steps: Step[], event: string, name?: string): void => {
  steps.push(name === undefined ? { event } : { event, name });
};

describe("M7-004 service lifecycle", () => {
  test("init runs in declaration order before traffic; handlers see resolved values", async () => {
    const steps: Step[] = [];
    const app = defineApp({
      services: {
        second: service({
          name: "second",
          value: { ready: false },
          init: async () => {
            await Bun.sleep(20);
            recorder(steps, "init", "second");
          },
        }),
        first: service({
          name: "first",
          value: { tag: "first" },
          init: () => {
            recorder(steps, "init", "first");
          },
        }),
      },
      routes: {
        "/who": {
          GET: route({
            handler: (ctx) => {
              recorder(steps, "handler");
              return json(200, { tag: (ctx.services as { first: { tag: string } }).first.tag });
            },
          }),
        },
      },
    });
    const server: LugasServer = app.serve({ port: 0 });
    try {
      await server.lugasLifecycle.ready;
      // Declaration order == services object key order (second declared first).
      expect(steps.map((s) => `${s.event}:${s.name}`)).toEqual(["init:second", "init:first"]);
      const response = await fetch(`${new URL(server.url).origin}/who`);
      expect(response.status).toBe(200);
      const body = (await response.json()) as { tag: string };
      expect(body.tag).toBe("first");
      expect(steps[steps.length - 1]).toEqual({ event: "handler" });
    } finally {
      const outcome = await server.lugasLifecycle.shutdown();
      expect(outcome.disposalCompleted).toBe(true);
    }
  });

  test("startup failure disposes initialized services in reverse and answers held requests with 503", async () => {
    const steps: Step[] = [];
    const app = defineApp({
      services: {
        ok: service({
          name: "ok",
          value: { open: true },
          init: () => recorder(steps, "init", "ok"),
          dispose: () => recorder(steps, "dispose", "ok"),
        }),
        later: service({
          name: "later",
          value: {},
          init: () => recorder(steps, "init", "later"),
          dispose: () => recorder(steps, "dispose", "later"),
        }),
        broken: service({
          name: "broken",
          value: {},
          init: () => {
            recorder(steps, "init", "broken");
            throw new Error("db unreachable");
          },
          dispose: () => recorder(steps, "dispose", "broken"),
        }),
      },
      routes: {
        "/never": {
          GET: route({ handler: () => json(200, { ran: true }) }),
        },
      },
    });
    const server: LugasServer = app.serve({ port: 0 });
    try {
      const readyOutcome = await server.lugasLifecycle.ready.then(
        () => "ready",
        (error: unknown) => (error instanceof Error ? error.message : "rejected"),
      );
      expect(readyOutcome).toBe("db unreachable");
      // Reverse-order rollback: only the already-initialized service.
      expect(steps.map((s) => `${s.event}:${s.name}`)).toEqual([
        "init:ok",
        "init:later",
        "init:broken",
        "dispose:later",
        "dispose:ok",
      ]);
      const response = await fetch(`${new URL(server.url).origin}/never`);
      expect(response.status).toBe(503);
      expect((await response.json() as { title: string }).title).toBe("unavailable");
    } finally {
      const outcome = await server.lugasLifecycle.shutdown();
      // Nothing was fully initialized; disposal phase completed trivially.
      expect(outcome.disposalCompleted).toBe(true);
      expect(steps.filter((s) => s.event === "dispose")).toHaveLength(2); // no duplicate rollback
    }
  });

  test("graceful shutdown: in-flight request completes permitted work before disposal; outcomes distinct", async () => {
    const steps: Step[] = [];
    let connectionsClosed = false;
    const app = defineApp({
      services: {
        db: service({
          name: "db",
          value: { handle: "db-handle" },
          dispose: () => {
            recorder(steps, "dispose", "db");
          },
        }),
      },
      routes: {
        "/slow": {
          GET: route({
            handler: async (ctx) => {
              await Bun.sleep(200);
              const db = (ctx.services as { db: { handle: string } }).db;
              recorder(steps, "handler-used-db");
              return json(200, { handle: db.handle, serverStillUp: !connectionsClosed });
            },
          }),
        },
      },
    });
    const server: LugasServer = app.serve({ port: 0 });
    try {
      await server.lugasLifecycle.ready;
      const inFlight = fetch(`${new URL(server.url).origin}/slow`);
      await Bun.sleep(30);
      const shutdownPromise = server.lugasLifecycle.shutdown();
      const response = await inFlight;
      connectionsClosed = true;
      expect(response.status).toBe(200);
      const body = (await response.json()) as { handle: string };
      expect(body.handle).toBe("db-handle"); // resource intact while the request finished its work
      const outcome = await shutdownPromise;
      expect(outcome.connectionsClosed).toBe(true);
      expect(outcome.trackedWorkCompleted).toBe(true);
      expect(outcome.disposalCompleted).toBe(true);
      expect(outcome.cooperated).toBe(true);
      expect(outcome.deadlineExpired).toBe(false);
      expect(outcome.disposalFailures).toEqual([]);
      expect(steps[steps.length - 1]).toEqual({ event: "dispose", name: "db" }); // disposal strictly after work
    } finally {
      await server.lugasLifecycle.shutdown();
    }
  });

  test("deadline invariant: expired drain force-closes connections but never closes resources underneath continuing work", async () => {
    let disposed = false;
    let continuationSawResource: string | null = null;
    const app = defineApp({
      services: {
        store: service({
          name: "store",
          value: { token: "store-token" },
          dispose: () => {
            disposed = true;
          },
        }),
      },
      routes: {
        "/detached": {
          GET: route({
            handler: async (ctx) => {
              const store = (ctx.services as { store: { token: string } }).store;
              // Work that outlives the drain deadline (non-cooperating).
              setTimeout(() => {
                continuationSawResource = disposed ? null : store.token;
              }, 350);
              await Bun.sleep(500); // request still in flight when the deadline expires
              return json(202, { accepted: true });
            },
          }),
        },
      },
    });
    const server: LugasServer = app.serve({ port: 0, shutdown: { drainDeadlineMs: 100 } });
    try {
      await server.lugasLifecycle.ready;
      void fetch(`${new URL(server.url).origin}/detached`).catch(() => undefined); // stays in flight past the deadline
      await Bun.sleep(30);
      const outcome: ShutdownOutcome = await server.lugasLifecycle.shutdown();
      expect(outcome.connectionsClosed).toBe(true);
      expect(outcome.trackedWorkCompleted).toBe(false);
      expect(outcome.disposalCompleted).toBe(false); // no disposal while work may continue
      expect(outcome.cooperated).toBe(false);
      expect(outcome.deadlineExpired).toBe(true);
      await Bun.sleep(250);
      expect(disposed).toBe(false); // resource never closed underneath continuing work
      expect(continuationSawResource as unknown as string).toBe("store-token"); // continuing work observed a defined, intact state
    } finally {
      await server.lugasLifecycle.shutdown();
    }
  });

  test("shutdown is idempotent: every caller observes the same outcome", async () => {
    const app = defineApp({
      services: {
        svc: service({ name: "svc", value: {}, dispose: () => undefined }),
      },
      routes: { "/x": { GET: route({ handler: () => json(200, {}) }) } },
    });
    const server: LugasServer = app.serve({ port: 0 });
    await server.lugasLifecycle.ready;
    const first = server.lugasLifecycle.shutdown();
    const second = server.lugasLifecycle.shutdown();
    const [a, b] = await Promise.all([first, second]);
    expect(b).toBe(a); // same outcome object, not two shutdown runs
  });

  test("track(): the drain waits for registered application work", async () => {
    let disposalCompleted = false;
    const app = defineApp({
      services: {
        svc: service({
          name: "svc",
          value: {},
          dispose: () => {
            disposalCompleted = true;
          },
        }),
      },
      routes: { "/x": { GET: route({ handler: () => json(200, {}) }) } },
    });
    const server: LugasServer = app.serve({ port: 0 });
    await server.lugasLifecycle.ready;
    let taskDone = false;
    const task = (async () => {
      await Bun.sleep(120);
      taskDone = true;
    })();
    server.lugasLifecycle.track(task);
    const outcome = await server.lugasLifecycle.shutdown();
    expect(taskDone).toBe(true);
    expect(outcome.trackedWorkCompleted).toBe(true);
    expect(disposalCompleted).toBe(true);
  });

  test("repeated connect/disconnect cycles return resource counts to baseline", async () => {
    let open = 0;
    const makeApp = () =>
      defineApp({
        services: {
          res: service({
            name: "res",
            value: {},
            init: () => {
              open += 1;
            },
            dispose: () => {
              open -= 1;
            },
          }),
        },
        routes: { "/x": { GET: route({ handler: () => json(200, {}) }) } },
      });
    for (let i = 0; i < 5; i += 1) {
      const server = makeApp().serve({ port: 0 });
      await server.lugasLifecycle.ready;
      expect(open).toBe(1); // exactly this cycle's service is initialized
      const outcome = await server.lugasLifecycle.shutdown();
      expect(outcome.disposalCompleted).toBe(true);
      expect(open).toBe(0); // counts return to baseline every cycle
    }
    expect(open).toBe(0);
  });

  test("plain services keep the live-reference contract unchanged", async () => {
    const plain = { counter: 0 };
    const app = defineApp({
      services: { plain },
      routes: {
        "/bump": {
          GET: route({
            handler: (ctx) => {
              (ctx.services as { plain: { counter: number } }).plain.counter += 1;
              return json(200, { counter: plain.counter });
            },
          }),
        },
      },
    });
    const server: LugasServer = app.serve({ port: 0 });
    try {
      const response = await fetch(`${new URL(server.url).origin}/bump`);
      expect((await response.json()) as { counter: number }).toEqual({ counter: 1 });
      expect(plain.counter).toBe(1); // same object, no copy
    } finally {
      await server.lugasLifecycle.shutdown();
    }
  });

  test("shutdown bounds a never-settling initializer and reports the expiry honestly", async () => {
    const never = new Promise<never>(() => {});
    const app = defineApp({
      services: { stuck: service({ name: "stuck", value: 1, init: () => never }) },
      routes: { "/ok": { GET: route({ handler: () => json(200, { fine: true }) }) } },
    });
    const server: LugasServer = app.serve({ port: 0, shutdown: { drainDeadlineMs: 150 } });
    try {
      // Pre-fix, shutdown() awaited the initializer before its deadline clock
      // started and never returned. The race guard fails the test fast if the
      // budget is not honored.
      const outcome = await Promise.race([
        server.lugasLifecycle.shutdown(),
        Bun.sleep(2_000).then(() => "HUNG" as const),
      ]);
      expect(outcome).not.toBe("HUNG");
      const o = outcome as ShutdownOutcome;
      expect(o.deadlineExpired).toBe(true);
      expect(o.disposalCompleted).toBe(false); // a half-initialized set is not honestly disposable
      expect(o.cooperated).toBe(false);
    } finally {
      await server.stop(true);
    }
  });

  test("shutdown bounds a never-settling disposer; remaining services are reported, not disposed", async () => {
    const never = new Promise<never>(() => {});
    const disposed: string[] = [];
    const app = defineApp({
      services: {
        // Declaration order first, healthy — reverse disposal reaches it last.
        healthy: service({
          name: "healthy",
          value: 1,
          dispose: () => {
            disposed.push("healthy");
          },
        }),
        stuck: service({
          name: "stuck",
          value: 1,
          dispose: () => never,
        }),
      },
      routes: { "/ok": { GET: route({ handler: () => json(200, { fine: true }) }) } },
    });
    const server: LugasServer = app.serve({ port: 0, shutdown: { drainDeadlineMs: 150 } });
    try {
      const outcome = await Promise.race([
        server.lugasLifecycle.shutdown(),
        Bun.sleep(2_000).then(() => "HUNG" as const),
      ]);
      expect(outcome).not.toBe("HUNG");
      const o = outcome as ShutdownOutcome;
      expect(o.deadlineExpired).toBe(true);
      expect(o.disposalCompleted).toBe(false);
      expect(o.trackedWorkCompleted).toBe(true); // the drain itself finished
      expect(o.disposalFailures).toContainEqual({ service: "stuck", message: "dispose did not settle within the shutdown deadline" });
      expect(o.disposalFailures).toContainEqual({ service: "healthy", message: "dispose not attempted: shutdown deadline expired" });
      expect(disposed).toEqual([]); // never falsely reported as disposed
    } finally {
      await server.stop(true);
    }
  });

  test("service() rejects invalid descriptors with a stable diagnostic", () => {
    const capture = (run: () => unknown): string => {
      try {
        run();
        return "no-throw";
      } catch (error) {
        return (error as { code?: string }).code ?? "no-code";
      }
    };
    expect(capture(() => service({ name: "", value: 1 }))).toBe("LUGAS_LIFECYCLE_001");
    expect(capture(() => service({ name: "x", value: 1, init: 42 as never }))).toBe("LUGAS_LIFECYCLE_001");
  });

  test("shutdown closes only the stopping server's sockets (one app, two listeners)", async () => {
    const app = defineApp({
      routes: {
        "/chat": { GET: websocket({ message: (ws, message) => { ws.send(message); } }) },
      },
    });
    const openSocket = async (server: LugasServer) => {
      const ws = new WebSocket(`ws://${new URL(server.url).host}/chat`);
      const closed = new Promise<{ code: number; reason: string }>((resolve) => {
        ws.addEventListener("close", (event) => resolve({ code: event.code, reason: event.reason }), { once: true });
      });
      await new Promise<void>((resolve, reject) => {
        ws.addEventListener("open", () => resolve(), { once: true });
        ws.addEventListener("error", () => reject(new Error("socket failed to open")), { once: true });
      });
      const echo = async (text: string): Promise<string> => {
        const reply = new Promise<string>((resolve) => {
          ws.addEventListener("message", (event) => resolve(String(event.data)), { once: true });
        });
        ws.send(text);
        return reply;
      };
      return { ws, closed, echo };
    };
    const first: LugasServer = app.serve({ port: 0, shutdown: { drainDeadlineMs: 250 } });
    const a = await openSocket(first);
    // A second listener of the SAME app shares the hub's route table; its
    // sockets must survive the first server's shutdown.
    const second: LugasServer = app.serve({ port: 0, shutdown: { drainDeadlineMs: 250 } });
    const b = await openSocket(second);
    try {
      expect(await b.echo("second-up")).toBe("second-up"); // both live before shutdown
      await first.lugasLifecycle.shutdown();
      expect(await a.closed).toEqual({ code: 1001, reason: "server shutting down" });
      expect(await b.echo("still-up")).toBe("still-up"); // the sibling keeps its connection
    } finally {
      await second.lugasLifecycle.shutdown();
      expect(await b.closed).toEqual({ code: 1001, reason: "server shutting down" });
      a.ws.close();
    }
  });

  test("new handshakes keep working on an earlier listener after a later one stops", async () => {
    const app = defineApp({
      routes: {
        "/chat": { GET: websocket({ message: (ws, message) => { ws.send(message); } }) },
      },
    });
    const first: LugasServer = app.serve({ port: 0, shutdown: { drainDeadlineMs: 250 } });
    try {
      // The upgrade previously resolved through the hub's single server
      // reference, which the later listener overwrote: once it stopped,
      // handshakes to this still-running listener answered a non-101
      // response. The receiving server must perform the upgrade.
      const second: LugasServer = app.serve({ port: 0, shutdown: { drainDeadlineMs: 250 } });
      await second.lugasLifecycle.shutdown();

      const socket = new WebSocket(`ws://${new URL(first.url).host}/chat`);
      await new Promise<void>((resolve, reject) => {
        socket.addEventListener("open", () => resolve(), { once: true });
        socket.addEventListener("error", () => reject(new Error("socket failed to open")), { once: true });
      });
      const reply = new Promise<string>((resolve) => {
        socket.addEventListener("message", (event) => resolve(String(event.data)), { once: true });
      });
      socket.send("first-still-accepts");
      expect(await reply).toBe("first-still-accepts");
      socket.close();
    } finally {
      await first.lugasLifecycle.shutdown();
    }
  });

  test("upgrades keep their receiving server behind every policy wrap (one app, two listeners)", async () => {
    // Every outer wrap (cors, secureHeaders, logging, telemetry) previously
    // forwarded only the request, dropping Bun's server argument: with any
    // policy configured, the per-request receiving-server record never
    // happened and the hub's stale serverRef answered the upgrade.
    const app = defineApp({
      cors: { origin: "*" },
      secureHeaders: true,
      logging: { access: true },
      telemetry: { onRequestStart() {}, onRequestEnd() {} },
      routes: {
        "/chat": { GET: websocket({ message: (ws, message) => { ws.send(message); } }) },
      },
    });
    const first: LugasServer = app.serve({ port: 0, shutdown: { drainDeadlineMs: 250 } });
    try {
      const second: LugasServer = app.serve({ port: 0, shutdown: { drainDeadlineMs: 250 } });
      // While both are live, the hub's fallback target is the second
      // listener: this handshake must still be performed by the first.
      const socket = new WebSocket(`ws://${new URL(first.url).host}/chat`);
      await new Promise<void>((resolve, reject) => {
        socket.addEventListener("open", () => resolve(), { once: true });
        socket.addEventListener("error", () => reject(new Error("socket failed to open")), { once: true });
      });
      const reply = new Promise<string>((resolve) => {
        socket.addEventListener("message", (event) => resolve(String(event.data)), { once: true });
      });
      socket.send("through-the-wraps");
      expect(await reply).toBe("through-the-wraps");
      socket.close();

      await second.lugasLifecycle.shutdown();
      // After the newest listener stopped, a fresh handshake to the
      // surviving listener must still succeed.
      const socket2 = new WebSocket(`ws://${new URL(first.url).host}/chat`);
      await new Promise<void>((resolve, reject) => {
        socket2.addEventListener("open", () => resolve(), { once: true });
        socket2.addEventListener("error", () => reject(new Error("handshake to the surviving listener failed")), { once: true });
      });
      const reply2 = new Promise<string>((resolve) => {
        socket2.addEventListener("message", (event) => resolve(String(event.data)), { once: true });
      });
      socket2.send("survivor");
      expect(await reply2).toBe("survivor");
      socket2.close();
    } finally {
      await first.lugasLifecycle.shutdown();
    }
  });

  test.skipIf(process.platform === "win32")("SIGTERM closes WebSockets and disposes services once (subprocess)", async () => {
    const child = Bun.spawn([process.execPath, join(ROOT, "tests/lifecycle/fixtures/signal-child.ts")], {
      stdout: "pipe",
      stderr: "inherit",
    });
    const reader = child.stdout.getReader();
    const decoder = new TextDecoder();
    const deadline = setTimeout(() => child.kill("SIGKILL"), 5_000);
    let stdout = "";
    let ws: WebSocket | undefined;
    try {
      let ready: RegExpExecArray | null = null;
      while (ready === null) {
        const chunk = await reader.read();
        if (chunk.done) throw new Error(`signal child exited before readiness: ${stdout}`);
        stdout += decoder.decode(chunk.value, { stream: true });
        ready = /^READY (\d+)\r?\n/m.exec(stdout);
      }
      const socket = new WebSocket(`ws://127.0.0.1:${ready[1]}/socket`);
      ws = socket;
      const closed = new Promise<CloseEvent>((resolve) => socket.addEventListener("close", resolve, { once: true }));
      await new Promise<void>((resolve, reject) => {
        socket.addEventListener("open", () => resolve(), { once: true });
        socket.addEventListener("error", () => reject(new Error("signal child WebSocket failed to open")), { once: true });
      });

      child.kill("SIGTERM");
      const event = await closed;
      expect({ code: event.code, reason: event.reason }).toEqual({ code: 1001, reason: "server shutting down" });
      expect(await child.exited).toBe(0);
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        stdout += decoder.decode(chunk.value, { stream: true });
      }
      expect(stdout.split(/\r?\n/).filter((line) => line === "DISPOSED")).toHaveLength(1);
    } finally {
      clearTimeout(deadline);
      ws?.close();
      if (child.exitCode === null) child.kill("SIGKILL");
      await child.exited;
      reader.releaseLock();
    }
  }, 10_000);
});
