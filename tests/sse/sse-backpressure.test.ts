/**
 * Bounded SSE producer backpressure (ADR-0036).
 *
 * Deterministic writer-level tests hold the hard bounds (queue bytes,
 * parked bytes, overload outcome, settlement, heartbeat skip), and one
 * live-server test exercises a real stalled consumer. Queue counters prove
 * the framework-owned bound — they do not claim total-process-memory
 * behavior.
 */
import { describe, expect, test } from "bun:test";
import { sse } from "../../src/index";
import { createTestServer } from "../../src/testing";
import { defineApp, route, json } from "../../src/index";

const event = (n: number, pad = 0): { id: number; data: string } => ({ id: n, data: "x".repeat(pad) + String(n) });

/** Creates a stream, capturing the writer; returns reader + writer + cleanup spy. */
function capture(config: Parameters<typeof sse>[0]) {
  let writer!: import("../../src/index").SseWriter;
  let cleanups = 0;
  const base = config as { start?: unknown };
  const original = base.start as (w: import("../../src/index").SseWriter) => void | (() => void);
  const res = sse({
    ...config,
    start: (w) => {
      writer = w;
      const result = original(w);
      return () => {
        cleanups += 1;
        if (typeof result === "function") result();
      };
    },
  });
  const reader = res.body!.getReader();
  return { res, reader, writer, get cleanups() { return cleanups; } };
}

/** Structural reader — Bun's global and node:stream/web reader types disagree on extras like `readMany`. */
type FrameReader = { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel(reason?: unknown): Promise<void> };

const decoded = async (reader: FrameReader, count: number): Promise<string> => {
  const decoder = new TextDecoder();
  let text = "";
  while (text.split("\n\n").filter((f) => f.trim()).length < count) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
};

describe("sendAwait: healthy reader", () => {
  test("order and content preserved; capacity path resolves immediately", async () => {
    const { reader, writer } = capture({ queueByteLimit: 64 * 1024, start: () => undefined });
    const first = performance.now();
    const results = await Promise.all([writer.sendAwait(event(1)), writer.sendAwait(event(2)), writer.sendAwait(event(3))]);
    expect(results).toEqual([true, true, true]);
    const text = await decoded(reader, 3);
    // first-event latency: events enqueued at capacity are on the wire promptly
    expect(performance.now() - first).toBeLessThan(1000);
    expect(text).toContain("id: 1");
    expect(text.indexOf("id: 1")).toBeLessThan(text.indexOf("id: 2"));
    expect(text.indexOf("id: 2")).toBeLessThan(text.indexOf("id: 3"));
    await reader.cancel().catch(() => undefined);
  });
});

describe("sendAwait: stalled reader bound (deterministic)", () => {
  test("queue stays within budget; parked bytes capped; overflow resolves false explicitly", async () => {
    const LIMIT = 1024;
    const c = capture({ queueByteLimit: LIMIT, start: () => undefined });
    const { reader, writer } = c;
    // Stall: no reads. Fill the queue.
    let parked = 0;
    const pending: Array<Promise<boolean>> = [];
    for (let i = 0; i < 50; i++) {
      const frame = event(i, 64); // ~90 encoded bytes
      const p = writer.sendAwait(frame);
      // Once congested, calls park — do not await them (fire-and-forget producer).
      void p.then((sent) => { if (!sent) parked += 1; });
      pending.push(p);
      // Give the first call a microtask to settle synchronously-resolved promises.
      if (i < 3) await Promise.resolve();
    }
    await Promise.resolve();
    // The bound: queue ≤ budget + largest single event; parked ≤ budget.
    expect(writer.queuedBytes!).toBeLessThanOrEqual(LIMIT + 128);
    expect(writer.pendingSendBytes).toBeLessThanOrEqual(LIMIT);
    // Total framework-owned retained payload within the documented bound.
    expect(writer.queuedBytes! + writer.pendingSendBytes).toBeLessThanOrEqual(2 * LIMIT + 128);
    // Settle the still-parked promises by ending the stream.
    writer.close();
    const outcomes = await Promise.all(pending);
    expect(outcomes.every((o) => o === true || o === false)).toBe(true);
    expect(parked).toBeGreaterThan(0); // the overload outcome occurred explicitly
    expect(c.cleanups).toBe(1);
  });

  test("single oversized event larger than the budget still sends once capacity exists", async () => {
    const LIMIT = 64;
    const { reader, writer } = capture({ queueByteLimit: LIMIT, start: () => undefined });
    const sent = await writer.sendAwait({ data: "y".repeat(512) }); // >> limit
    expect(sent).toBe(true);
    const text = await decoded(reader, 1);
    expect(text).toContain("yyyyy");
    await reader.cancel().catch(() => undefined);
  });
});

describe("settlement", () => {
  // Congestion layout for a 128-byte limit with ~90-byte frames: send #1
  // enqueues (queue ~90, desiredSize ~38), send #2 enqueues (desiredSize
  // goes negative — congested), send #3 parks (~90 ≤ 128 parked cap). The
  // small final event (~35 bytes) still fits the parked cap, so it becomes
  // a GENUINELY PENDING write — not an immediate overload false (CA-9).
  test("disconnect (cancel) during a genuinely pending write settles it false; cleanup exactly once", async () => {
    const c = capture({ queueByteLimit: 128, start: () => undefined });
    const { reader, writer } = c;
    void writer.sendAwait(event(0, 64));
    void writer.sendAwait(event(1, 64));
    void writer.sendAwait(event(2, 64));
    await Promise.resolve();
    expect(writer.pendingSendBytes).toBeGreaterThan(0); // a write is parked

    const blocked = writer.sendAwait(event(99, 20)); // small: fits the parked cap
    let settled = false;
    void blocked.then(() => { settled = true; });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false); // PROVEN unsettled before cancellation
    expect(writer.pendingSendBytes).toBeGreaterThan(0);

    reader.cancel().catch(() => undefined); // client disconnect mid-write
    expect(await blocked).toBe(false);
    expect(settled).toBe(true);
    expect(writer.pendingSendBytes).toBe(0);
    expect(c.cleanups).toBe(1);
  });

  test("close() during a genuinely pending write settles it false; cleanup exactly once", async () => {
    const c = capture({ queueByteLimit: 128, start: () => undefined });
    const { writer } = c;
    void writer.sendAwait(event(0, 64));
    void writer.sendAwait(event(1, 64));
    void writer.sendAwait(event(2, 64));
    await Promise.resolve();
    expect(writer.pendingSendBytes).toBeGreaterThan(0);

    const blocked = writer.sendAwait(event(99, 20));
    let settled = false;
    void blocked.then(() => { settled = true; });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false);

    writer.close();
    expect(await blocked).toBe(false);
    expect(settled).toBe(true);
    expect(writer.pendingSendBytes).toBe(0);
    expect(c.cleanups).toBe(1);
  });

  test("sendAwait after close resolves false without queueing", async () => {
    const { writer } = capture({ queueByteLimit: 4096, start: () => undefined });
    writer.close();
    expect(await writer.sendAwait(event(1))).toBe(false);
    expect(writer.queuedBytes).toBe(0);
  });
});

describe("send() compatibility (ADR-0036 #4)", () => {
  test("the synchronous contract is unchanged: non-blocking, enqueues, escapes the budget by choice", () => {
    const { reader, writer } = capture({ queueByteLimit: 128, start: () => undefined });
    for (let i = 0; i < 10; i++) {
      expect(writer.send(event(i, 64))).toBe(true); // never blocks, never rejects
    }
    expect(writer.queuedBytes!).toBeGreaterThan(128); // the documented unbounded escape hatch
    reader.cancel().catch(() => undefined);
  });
});

describe("heartbeat under congestion (ADR-0036 #6)", () => {
  test("skipped while congested (no growing backlog); timer-generated heartbeats RESUME after the reader drains", async () => {
    const LIMIT = 256; // 8 events (~48 bytes each) genuinely exceed the budget
    const { reader, writer } = capture({ queueByteLimit: LIMIT, heartbeatMs: 10, start: () => undefined });
    for (let i = 0; i < 8; i++) void writer.sendAwait(event(i, 32));
    await Promise.resolve();
    const before = writer.queuedBytes! + writer.pendingSendBytes;
    expect(before).toBeGreaterThan(LIMIT); // the stream IS congested
    await new Promise((resolve) => setTimeout(resolve, 45)); // ~4 heartbeat ticks
    const after = writer.queuedBytes! + writer.pendingSendBytes;
    expect(after).toBeLessThanOrEqual(before); // no heartbeat accumulation while congested
    // Drain: capacity returns; parked events flush.
    await decoded(reader, 8);
    // Resumption must be the TIMER's work, not a manual write: read until a
    // deadline-bounded window contains a heartbeat frame produced by the
    // interval (first beat lands within one interval of the drain).
    const deadline = Date.now() + 500;
    let tail = "";
    const decoder = new TextDecoder();
    while (Date.now() < deadline) {
      const chunk = await Promise.race([
        reader.read(),
        new Promise<{ done: true }>((resolve) => setTimeout(() => resolve({ done: true }), 50)),
      ]);
      if (chunk.done && tail.includes(": heartbeat")) break;
      if (chunk.done) continue;
      tail += decoder.decode(chunk.value, { stream: true });
      if (tail.includes(": heartbeat")) break;
    }
    expect(tail).toContain(": heartbeat"); // automatic heartbeats resumed
    reader.cancel().catch(() => undefined);
  });
});

describe("no SSE work without opt-in", () => {
  test("queueByteLimit alone creates no timers; queuedBytes stays null without the budget", () => {
    const originalSetInterval = globalThis.setInterval;
    let timersCreated = 0;
    globalThis.setInterval = ((handler: () => void, timeout: number) => {
      timersCreated += 1;
      const timer = originalSetInterval(handler, timeout);
      timer.unref?.();
      return timer;
    }) as unknown as typeof setInterval;
    try {
      const { writer } = capture({ queueByteLimit: 1024, start: () => undefined });
      expect(timersCreated).toBe(0);
      expect(writer.queuedBytes).toBe(0); // budget configured → bytes, empty queue
      writer.close();

      const { writer: bare } = capture({ start: () => undefined });
      expect(bare.queuedBytes).toBeNull(); // no budget → no byte-accounting claim
      bare.close();
      expect(timersCreated).toBe(0);
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  test("config validation: LUGAS_SSE_001 on bad queueByteLimit or unknown keys", () => {
    const expectCode = (run: () => unknown): void => {
      try {
        run();
        throw new Error("expected throw");
      } catch (error) {
        expect((error as { code?: string }).code).toBe("LUGAS_SSE_001");
      }
    };
    expectCode(() => sse({ start: () => undefined, queueByteLimit: 0 }));
    expectCode(() => sse({ start: () => undefined, queueByteLimit: 1.5 }));
    expectCode(() => sse({ start: () => undefined, bogus: 1 } as never));
  });
});

describe("served stalled consumer (live)", () => {
  test("read-then-stall holds the bound; parking settles on abort; release is prompt and exactly-once", async () => {
    const state = { cleanups: 0, maxRetained: 0, parkedSeen: false, settledFalse: 0 };
    const app = defineApp({
      routes: {
        "/events": {
          GET: route({
            handler: () =>
              sse({
                queueByteLimit: 2048,
                start: (writer) => {
                  void (async () => {
                    // ~450 KB total: loopback socket buffers may absorb part
                    // of this (they sit OUTSIDE the queue per ADR-0036's
                    // claim), so parking is expected but not forced here —
                    // the unconditional parked-write proof is the
                    // deterministic settlement tests above.
                    for (let i = 0; i < 5000; i++) {
                      const pending = writer.pendingSendBytes;
                      const p = writer.sendAwait(event(i, 64));
                      void p.then((sent) => { if (!sent) state.settledFalse += 1; });
                      await Promise.resolve();
                      if (writer.pendingSendBytes > pending && writer.pendingSendBytes > 0) state.parkedSeen = true;
                      state.maxRetained = Math.max(state.maxRetained, (writer.queuedBytes ?? 0) + writer.pendingSendBytes);
                      if (state.settledFalse > 0) break; // ended or overloaded: stop producing
                    }
                  })();
                  return () => { state.cleanups += 1; };
                },
              }),
          }),
        },
        "/health": { GET: route({ handler: () => json(200, { ok: true }) }) },
      },
    });
    const server = createTestServer(app);
    const ac = new AbortController();
    try {
      const response = await fetch(`${server.url}/events`, { signal: ac.signal });
      const reader = response.body!.getReader();
      await reader.read(); // read one chunk, then stall
      await new Promise((resolve) => setTimeout(resolve, 150)); // producer runs against the stall
      expect(state.maxRetained).toBeLessThanOrEqual(2048 * 2 + 128); // documented bound (always)
      ac.abort(); // disconnect during (possibly) blocked writes
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (state.parkedSeen) {
        // If production crossed socket buffering far enough to park a write,
        // that write must have settled false on disconnect.
        expect(state.settledFalse).toBeGreaterThanOrEqual(1);
      }
      expect(state.cleanups).toBe(1); // released promptly, exactly once (always)
    } finally {
      await server.stop();
    }
  });
});
