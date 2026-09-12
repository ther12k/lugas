/**
 * M8-002 — served SSE behavior (ADR-0023).
 *
 * Pinned contract: correct response headers; frames arrive incrementally;
 * the `start` cleanup runs exactly once on every end path — `writer.close()`,
 * client abort (request.signal → stream cancel), and server force-close —
 * with the opt-in heartbeat timer owned by the helper; CORS policy headers
 * pair with stream responses (ADR-0022); an open stream is in-flight work
 * for the ADR-0020 drain (deadline force-close runs cleanup; closing the
 * writer during drain lets shutdown cooperate).
 */
import { afterAll, describe, expect, test } from "bun:test";
import { defineApp, route, sse } from "../../src";

const ALLOWED = "https://app.example.com";

const servers: Array<ReturnType<ReturnType<typeof defineApp>["serve"]>> = [];
afterAll(() => {
  for (const server of servers) server.stop(true);
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Minimal structural reader — Bun's global and node:stream/web reader types disagree on extras like `readMany`. */
type FrameReader = { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel(reason?: unknown): Promise<void> };

/** Reads the stream until `predicate` matches the accumulated text or the deadline passes. */
async function readUntil(reader: FrameReader, predicate: (text: string) => boolean, timeoutMs = 3000): Promise<string> {
  const decoder = new TextDecoder();
  let text = "";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate(text)) return text;
    const chunk = await Promise.race([reader.read(), sleep(timeoutMs).then(() => ({ done: true as const, value: undefined }))]);
    if (chunk.done) return text;
    text += decoder.decode(chunk.value, { stream: true });
  }
  return text;
}

function start(config: Parameters<typeof defineApp>[0]): ReturnType<ReturnType<typeof defineApp>["serve"]> {
  const server = defineApp(config).serve({ port: 0, development: false });
  servers.push(server);
  return server;
}

const urlOf = (server: ReturnType<ReturnType<typeof defineApp>["serve"]>): string => `${new URL(server.url).origin}`;

describe("M8-002 served SSE behavior", () => {
  test("response headers: text/event-stream; charset=utf-8 and no-cache", async () => {
    const server = start({ routes: { "/events": { GET: route({ handler: () => sse({ start: (writer) => writer.close() }) }) } } });
    const response = await fetch(`${urlOf(server)}/events`);
    expect(response.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-cache");
    await response.text();
  });

  test("frames arrive incrementally with pinned wire format", async () => {
    const server = start({
      routes: {
        "/events": {
          GET: route({
            handler: () =>
              sse({
                start: (writer) => {
                  writer.retry(3000);
                  writer.send({ id: "1", event: "tick", data: "hello" });
                },
              }),
          }),
        },
      },
    });
    const response = await fetch(`${urlOf(server)}/events`);
    const reader = response.body!.getReader();
    const text = await readUntil(reader, (t) => t.endsWith("data: hello\n\n"));
    expect(text).toBe("retry: 3000\n\nid: 1\nevent: tick\ndata: hello\n\n");
    await reader.cancel().catch(() => undefined);
  });

  test("cleanup runs exactly once on writer.close(); sends after close return false", async () => {
    const cleanups: number[] = [];
    let lateSend: boolean | undefined;
    const server = start({
      routes: {
        "/events": {
          GET: route({
            handler: () =>
              sse({
                heartbeatMs: 15,
                start: (writer) => {
                  const timer = setInterval(() => void writer.send({ data: "bg" }), 30);
                  return () => {
                    clearInterval(timer);
                    cleanups.push(Date.now());
                    lateSend = writer.send({ data: "late" });
                  };
                },
              }),
          }),
        },
      },
    });
    const response = await fetch(`${urlOf(server)}/events`);
    const reader = response.body!.getReader();
    // Trigger close from the "server side" via a second request is not
    // possible — the writer is handler-scoped; here the handler already
    // returned, so drive close through the abort path instead. For the
    // close path itself, use a handler that closes after its first send.
    const server2 = start({
      routes: {
        "/self-closing": {
          GET: route({
            handler: () =>
              sse({
                start: (writer) => {
                  writer.send({ data: "only" });
                  writer.close();
                  return () => {
                    cleanups.push(Date.now());
                    lateSend = writer.send({ data: "late" });
                  };
                },
              }),
          }),
        },
      },
    });
    const response2 = await fetch(`${urlOf(server2)}/self-closing`);
    const text2 = await response2.text(); // completes when the stream closes
    expect(text2).toBe("data: only\n\n");
    await sleep(100);
    expect(cleanups.length).toBe(1); // exactly once: close inside start() still runs it
    expect(lateSend).toBe(false); // late send after close: false, no throw
    await reader.cancel().catch(() => undefined);
  });

  test("cleanup runs exactly once on client abort; heartbeat timer stops with it", async () => {
    const heartbeatMs = 15;
    let cleanups = 0;
    const server = start({
      routes: {
        "/events": {
          GET: route({
            handler: () =>
              sse({
                heartbeatMs,
                start: (writer) => {
                  const timer = setInterval(() => void writer.send({ data: "bg" }), 40);
                  return () => {
                    clearInterval(timer);
                    cleanups += 1;
                  };
                },
              }),
          }),
        },
      },
    });
    const ac = new AbortController();
    const response = await fetch(`${urlOf(server)}/events`, { signal: ac.signal });
    const reader = response.body!.getReader();
    const text = await readUntil(reader, (t) => t.includes(": heartbeat"));
    expect(text).toContain(": heartbeat\n\n");
    ac.abort();
    await sleep(200);
    expect(cleanups).toBe(1);
  });

  test("cleanup runs exactly once on server force-close (stop(true))", async () => {
    let cleanups = 0;
    const app = defineApp({
      routes: {
        "/events": {
          GET: route({
            handler: () =>
              sse({
                start: (writer) => {
                  writer.send({ data: "open" }); // first byte flushes the response headers
                  return () => {
                    cleanups += 1;
                  };
                },
              }),
          }),
        },
      },
    });
    const server = app.serve({ port: 0, development: false });
    const response = await fetch(`${new URL(server.url).origin}/events`);
    const reader = response.body!.getReader();
    await readUntil(reader, (t) => t.includes("data: open"));
    server.stop(true);
    await sleep(200);
    expect(cleanups).toBe(1);
  });

  test("drain interaction (ADR-0020): deadline force-close runs cleanup; cooperative close succeeds", async () => {
    // Deadline path: open stream holds the drain; force-close at expiry runs cleanup.
    let deadlineCleanups = 0;
    const app1 = defineApp({
      routes: {
        "/events": {
          GET: route({
            handler: () =>
              sse({
                start: (writer) => {
                  writer.send({ data: "open" });
                  return () => {
                    deadlineCleanups += 1;
                  };
                },
              }),
          }),
        },
      },
    });
    const server1 = app1.serve({ port: 0, development: false, shutdown: { drainDeadlineMs: 150 } });
    const response1 = await fetch(`${new URL(server1.url).origin}/events`);
    const reader1 = response1.body!.getReader();
    await readUntil(reader1, (t) => t.includes("data: open"));
    const outcome1 = await server1.lugasLifecycle.shutdown("test");
    expect(outcome1.deadlineExpired).toBe(true);
    expect(outcome1.cooperated).toBe(false);
    await sleep(200);
    expect(deadlineCleanups).toBe(1);

    // Cooperative path: closing the writer during the drain completes shutdown.
    let cooperativeCleanups = 0;
    let writerRef: import("../../src").SseWriter | undefined;
    const app2 = defineApp({
      routes: {
        "/events": {
          GET: route({
            handler: () =>
              sse({
                start: (writer) => {
                  writer.send({ data: "open" });
                  writerRef = writer;
                  return () => {
                    cooperativeCleanups += 1;
                  };
                },
              }),
          }),
        },
      },
    });
    const server2 = app2.serve({ port: 0, development: false, shutdown: { drainDeadlineMs: 5000 } });
    const response2 = await fetch(`${new URL(server2.url).origin}/events`);
    const reader2 = response2.body!.getReader();
    await readUntil(reader2, (t) => t.includes("data: open"));
    const shutdown2 = server2.lugasLifecycle.shutdown("test");
    await sleep(50);
    writerRef!.close();
    const outcome2 = await shutdown2;
    expect(outcome2.cooperated).toBe(true);
    expect(outcome2.deadlineExpired).toBe(false);
    expect(cooperativeCleanups).toBe(1);
    servers.push(server1, server2);
  });

  test("CORS pairing (ADR-0022): stream response carries ACAO and Vary under a configured policy", async () => {
    const server = start({
      cors: { origin: ALLOWED },
      routes: {
        "/events": { GET: route({ handler: () => sse({ start: (writer) => { writer.send({ data: "x" }); writer.close(); } }) }) },
      },
    });
    const response = await fetch(`${urlOf(server)}/events`, { headers: { origin: ALLOWED } });
    expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED);
    expect(response.headers.get("vary")).toBe("Origin");
    expect(response.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
    await response.text();
  });

  test("last-event-id is an application concern: handler reads the plain request header", async () => {
    const server = start({
      routes: {
        "/events": {
          GET: route({
            handler: (ctx) =>
              sse({
                start: (writer) => {
                  const lastEventId = ctx.request.headers.get("last-event-id");
                  writer.send({ id: lastEventId === null ? 0 : Number(lastEventId) + 1, data: "resume" });
                  writer.close();
                },
              }),
          }),
        },
      },
    });
    const response = await fetch(`${urlOf(server)}/events`, { headers: { "last-event-id": "41" } });
    expect(await response.text()).toBe("id: 42\ndata: resume\n\n");
  });

  test("throwing start() surfaces as a redacted 500 problem via the error policy (never a silent empty 200)", async () => {
    const server = start({
      routes: {
        "/boom": { GET: route({ handler: () => sse({ start: () => { throw new Error("producer failed"); } }) }) },
      },
    });
    const response = await fetch(`${urlOf(server)}/boom`);
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    const body = (await response.json()) as { title?: string };
    expect(body.title).toBe("Internal Server Error"); // redacted: no producer error details
  });

  test("desiredSize mirrors the stream while open and is null after close", async () => {
    let observed: number | null | undefined;
    let afterClose: boolean | undefined;
    const server = start({
      routes: {
        "/events": {
          GET: route({
            handler: () =>
              sse({
                start: (writer) => {
                  writer.send({ data: "x" });
                  observed = writer.desiredSize;
                  writer.close();
                  afterClose = writer.send({ data: "y" });
                  expect(writer.desiredSize).toBeNull();
                },
              }),
          }),
        },
      },
    });
    await (await fetch(`${urlOf(server)}/events`)).text();
    expect(typeof observed).toBe("number");
    expect(afterClose).toBe(false);
  });

  test("configuration diagnostics: LUGAS_SSE_001", () => {
    const expectCode = (run: () => unknown): void => {
      try {
        run();
        throw new Error("expected throw");
      } catch (error) {
        expect((error as { code?: string }).code).toBe("LUGAS_SSE_001");
      }
    };
    expectCode(() => sse("nope" as never));
    expectCode(() => sse(null as never));
    expectCode(() => sse({} as never));
    expectCode(() => sse({ start: "x" } as never));
    expectCode(() => sse({ start: () => undefined, heartbeatMs: 0 }));
    expectCode(() => sse({ start: () => undefined, heartbeatMs: -5 }));
    expectCode(() => sse({ start: () => undefined, heartbeatMs: 1.5 }));
    expectCode(() => sse({ start: () => undefined, bogus: 1 } as never));
  });

  test("writer input diagnostics: LUGAS_SSE_002 (no bare TypeErrors at the boundary)", () => {
    const expectCode = (run: () => unknown): void => {
      try {
        run();
        throw new Error("expected throw");
      } catch (error) {
        expect((error as { code?: string }).code).toBe("LUGAS_SSE_002");
      }
    };
    let writer: import("../../src").SseWriter | undefined;
    sse({ start: (w) => { writer = w; } });
    expectCode(() => writer!.send({ data: 10n as never }));
    expectCode(() => writer!.comment("a\nb"));
    expectCode(() => writer!.comment(5 as never));
    expectCode(() => writer!.retry(-1));
  });

  test("heartbeat timer lifecycle: created for a live stream, never after a synchronous close (CA-2)", () => {
    const originalSetInterval = globalThis.setInterval;
    let timersCreated = 0;
    globalThis.setInterval = ((handler: () => void, timeout: number) => {
      timersCreated += 1;
      const timer = originalSetInterval(handler, timeout);
      timer.unref?.(); // if the fix regresses, a leaked timer must not hang the runner
      return timer;
    }) as unknown as typeof setInterval;
    try {
      let writer: import("../../src").SseWriter | undefined;
      const live = sse({ heartbeatMs: 10, start: (w) => { writer = w; } });
      expect(live.status).toBe(200);
      expect(timersCreated).toBe(1); // live stream: the helper owns exactly one timer
      writer!.close(); // clears it through the normal close path

      let cleanups = 0;
      const closedEarly = sse({
        heartbeatMs: 10,
        start: (w) => {
          w.close();
          return () => { cleanups += 1; };
        },
      });
      expect(closedEarly.status).toBe(200);
      expect(cleanups).toBe(1); // cleanup still runs exactly once
      expect(timersCreated).toBe(1); // regression: no timer may outlive the early cleanup
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });
});
