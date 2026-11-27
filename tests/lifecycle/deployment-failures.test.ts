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

/**
 * Probes a socket during drain/shutdown, distinguishing actual socket closure
 * (connection-refused) from timeouts and still-accepting servers.
 *
 * Catches the test-oracle flaw (LR2-05 / negative control) where an accepted
 * but hanging request was collapsed into generic "not-accepting".
 */
export async function probeDrainSocket(
  url: string,
  timeoutMs: number = 2_000,
): Promise<"answered" | "connection-refused" | "timeout" | string> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return "answered";
  } catch (err: any) {
    if (err?.name === "TimeoutError") return "timeout";
    if (
      err?.code === "ConnectionRefused" ||
      err?.cause?.code === "ECONNREFUSED" ||
      (err?.name === "TypeError" &&
        typeof err?.message === "string" &&
        (err.message.includes("Unable to connect") ||
          err.message.includes("ConnectionRefused") ||
          err.message.includes("fetch failed")))
    ) {
      return "connection-refused";
    }
    return `error:${err?.name}:${err?.message}`;
  }
}

describe("deployment failure modes (#448)", () => {
  test("negative control: an accepted but hanging connection yields 'timeout' and fails the connection-refused check", async () => {
    // Deliberately accept connections but never send an HTTP response.
    const hangingServer = Bun.serve({
      port: 0,
      fetch() {
        return new Promise(() => {});
      },
    });
    try {
      const res = await probeDrainSocket(`http://127.0.0.1:${hangingServer.port}/ready`, 100);
      expect(res).toBe("timeout");
      expect(res).not.toBe("connection-refused");
    } finally {
      hangingServer.stop(true);
    }
  });

  test("readiness answers 200 while ready; once shutdown starts the port actively refuses connections", async () => {
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
      const duringDrain = await probeDrainSocket(`${base}/ready`, 2_000);
      expect(duringDrain).toBe("connection-refused");
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

  test("on client disconnect the request signal aborts but an uncooperative handler runs to completion (documented limitation)", async () => {
    const events: string[] = [];
    const app = defineApp({
      routes: {
        "/work": {
          GET: route({
            handler: async (ctx) => {
              // Observe the disconnect the way Bun reports it: the request
              // signal aborts. The handler itself never awaits or observes
              // the signal, which is exactly the "uncooperative handler"
              // shape the README's beta limitation describes.
              ctx.request.signal.addEventListener("abort", () => events.push("SIGNAL-ABORTED"), { once: true });
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
      // The demonstrated facts: the platform surface reports the disconnect
      // (signal aborts), and the handler side is NOT cancelled — a bare
      // sleep + push would complete by language semantics alone, so the
      // signal assertion is what gives this row its teeth.
      await Bun.sleep(450);
      expect(events).toEqual(["SIGNAL-ABORTED", "WORK-COMPLETED"]); // signal fired; handler ran on
      expect(clientResult).toBe("aborted:AbortError");
      const outcome = await server.lugasLifecycle.shutdown();
      expect(outcome.disposalCompleted).toBe(true);
    } finally {
      await server.lugasLifecycle.shutdown();
    }
  });
});
