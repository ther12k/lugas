/**
 * Deployment failure-mode evidence (#448) — in-process scenarios the
 * lifecycle and production suites leave open, each pinned to OBSERVED
 * Bun 1.4.0/Linux behavior (probed before being written down):
 *
 * 1. During a drain the port stops accepting: the readiness endpoint does
 *    not answer 503 or 200 — the fetch itself fails. Readiness semantics
 *    (503 while starting, 200 ready, 503 after failed init) are owned by
 *    tests/production/production.test.ts; this row covers the drain state.
 * 2. A server-initiated shutdown runs the SSE stream's deterministic
 *    cleanup exactly once and terminates the client's stream read.
 * 3. A client that disconnects mid-handler does NOT cancel handler work —
 *    the README documents this beta limitation; here it is demonstrated,
 *    not promised away.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, json, route, service, sse } from "../../src";
import type { LugasServer } from "../../src/internal/serve";

describe("deployment failure modes (#448)", () => {
  test("readiness answers 200 while ready; once shutdown starts the port stops accepting", async () => {
    const app = defineApp({
      health: true,
      services: { db: service({ name: "db", value: {}, dispose: () => undefined }) },
      routes: { "/x": { GET: route({ handler: () => json(200, {}) }) } },
    });
    const server: LugasServer = app.serve({ port: 0, shutdown: { drainDeadlineMs: 250 } });
    try {
      await server.lugasLifecycle.ready;
      const base = new URL(server.url).origin;
      const before = await fetch(`${base}/ready`);
      expect(before.status).toBe(200);
      expect(await before.json()).toEqual({ status: "ready" });

      const shutdown = server.lugasLifecycle.shutdown();
      const duringDrain = await fetch(`${base}/ready`).then(
        () => "answered",
        () => "not-accepting",
      );
      expect(duringDrain).toBe("not-accepting");
      const outcome = await shutdown;
      expect(outcome.disposalCompleted).toBe(true);
    } finally {
      await server.lugasLifecycle.shutdown();
    }
  });

  test("shutdown runs the SSE cleanup exactly once and terminates the client's stream read", async () => {
    const events: string[] = [];
    const app = defineApp({
      services: { db: service({ name: "db", value: {}, dispose: () => { events.push("DISPOSED"); } }) },
      routes: {
        "/events": {
          GET: route({
            handler: () =>
              sse({
                start: (writer) => {
                  writer.send({ event: "init", data: "open" });
                  const timer = setInterval(() => writer.send({ event: "tick", data: "t" }), 60);
                  return () => {
                    clearInterval(timer);
                    events.push("SSE-CLEANUP");
                  };
                },
              }),
          }),
        },
      },
    });
    const server: LugasServer = app.serve({ port: 0, shutdown: { drainDeadlineMs: 250 } });
    try {
      await server.lugasLifecycle.ready;
      const base = new URL(server.url).origin;
      const stream = await fetch(`${base}/events`);
      const reader = stream.body!.getReader();
      const first = await reader.read();
      expect(new TextDecoder().decode(first.value!)).toContain("event: init");
      const readerSettled = (async () => {
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) return "done";
          }
        } catch {
          return "errored";
        }
      })();

      const outcome = await server.lugasLifecycle.shutdown();
      // Observed (Bun 1.4.0, Linux): an open SSE stream is in-flight work.
      // With a 250ms deadline the drain expires, the cleanup runs exactly
      // once, and disposal is withheld — the ADR-0020 invariant that
      // resources are never closed underneath continuing work.
      expect(outcome.deadlineExpired).toBe(true);
      expect(outcome.disposalCompleted).toBe(false);
      expect(outcome.cooperated).toBe(false);
      expect(events).toEqual(["SSE-CLEANUP"]); // cleanup ran once; disposal withheld
      const readerResult = await Promise.race([readerSettled, Bun.sleep(2_000).then(() => "still-open")]);
      expect(readerResult === "done" || readerResult === "errored").toBe(true);
    } finally {
      await server.lugasLifecycle.shutdown();
    }
  });

  test("a client disconnect mid-handler does not cancel the handler's work (documented limitation)", async () => {
    const events: string[] = [];
    const app = defineApp({
      routes: {
        "/work": {
          GET: route({
            handler: async () => {
              await Bun.sleep(300);
              events.push("WORK-COMPLETED");
              return json(200, { ok: true });
            },
          }),
        },
      },
    });
    const server: LugasServer = app.serve({ port: 0, shutdown: { drainDeadlineMs: 1_000 } });
    try {
      await server.lugasLifecycle.ready;
      const base = new URL(server.url).origin;
      const controller = new AbortController();
      const pending = fetch(`${base}/work`, { signal: controller.signal }).then(
        () => "completed",
        (error: unknown) => (error instanceof Error ? `aborted:${error.name}` : "aborted"),
      );
      await Bun.sleep(50); // mid-handler: the 300ms handler has ~250ms left
      controller.abort();
      const clientResult = await pending;
      // The demonstrated fact is the handler side: the work is not cancelled.
      await Bun.sleep(450);
      expect(events).toEqual(["WORK-COMPLETED"]); // handler ran to completion
      expect(clientResult).toBe("aborted:AbortError");
      const outcome = await server.lugasLifecycle.shutdown();
      expect(outcome.disposalCompleted).toBe(true);
    } finally {
      await server.lugasLifecycle.shutdown();
    }
  });
});
