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
import { defineApp, json, route, service } from "../../src";
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

  test("opt-in SIGTERM drives the same shutdown path (subprocess)", async () => {
    const child = Bun.spawn([process.execPath, join(ROOT, "tests/lifecycle/fixtures/signal-child.ts")], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const reader = (child.stdout as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let stdout = "";
    const deadline = Date.now() + 15_000;
    while (!stdout.includes("READY") && Date.now() < deadline) {
      const chunk = await reader.read();
      if (chunk.done) break;
      stdout += decoder.decode(chunk.value, { stream: true });
    }
    expect(stdout).toContain("READY");
    child.kill("SIGTERM");
    const exit = await child.exited;
    const rest = decoder.decode((await reader.read()).value ?? new Uint8Array());
    stdout += rest;
    expect(exit).toBe(0);
    expect(stdout).toContain("SIGNAL-OUTCOME");
    const payload = JSON.parse(stdout.split("SIGNAL-OUTCOME")[1]!.trim()) as {
      cooperated: boolean;
      disposalCompleted: boolean;
    };
    expect(payload.cooperated).toBe(true);
    expect(payload.disposalCompleted).toBe(true);
  });
});
