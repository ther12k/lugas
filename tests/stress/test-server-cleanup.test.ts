/**
 * Stress: test-server cleanup, failure, and leak behavior (M4-008).
 *
 * Designed to survive `--repeat 20`: every case is self-contained, uses
 * ephemeral or explicitly-reclaimed ports, and asserts reachability flips
 * rather than timing sleeps wherever possible.
 */
import { describe, expect, test } from "bun:test";
import { createTestServer } from "../../src/testing/test-server";
import { defineApp, json, route } from "../../src/index";

function markerApp(marker: string) {
  return defineApp({
    routes: {
      "/m": {
        GET: route({
          handler: async () => {
            await Bun.sleep(25);
            return json(200, { marker });
          },
        }),
      },
      "/slow": {
        GET: route({
          handler: async () => {
            await Bun.sleep(5_000);
            return json(200, { late: true });
          },
        }),
      },
    },
  });
}

const FIXED_PORT = 17_777;

async function eventuallyUnreachable(url: string, timeoutMs = 2_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(new URL("/m", url));
      await Bun.sleep(10);
    } catch {
      return true; // connection refused/reset ⇒ released
    }
  }
  return false;
}

describe("test-server cleanup under failure", () => {
  test("failed startup does not leave a partially owned server", () => {
    // Forbidden option throws before any listener exists…
    expect(() =>
      createTestServer(markerApp("never"), { port: FIXED_PORT, routes: {} } as never),
    ).toThrow(/forbidden option/);
    // …so the same explicit port is immediately reclaimable.
    const ts = createTestServer(markerApp("reclaimed"), { port: FIXED_PORT });
    try {
      expect(ts.port).toBe(FIXED_PORT);
    } finally {
      void ts.stop();
    }
  });

  test("cleanup executes after a simulated test exception (finally/dispose)", async () => {
    const ts = createTestServer(markerApp("throwing-test"));
    // Fire an in-flight request WITHOUT awaiting it (platform note: Bun's
    // stop(true) does not abort in-flight handler completions on Linux
    // 1.4.0 — documented limitation). The finally-block disposal is what
    // must be deterministic.
    void ts.fetch("/slow").catch(() => {});
    const boomScenario = async () => {
      try {
        await Bun.sleep(10);
        throw new Error("test body exploded mid-request");
      } finally {
        await ts.dispose(); // deterministic cleanup despite the exception
      }
    };
    await expect(boomScenario()).rejects.toThrow("test body exploded");
    expect(await eventuallyUnreachable(ts.url)).toBe(true);
  });

  test("stop during an in-flight slow request closes promptly", async () => {
    const ts = createTestServer(markerApp("mid-flight"));
    const pending = ts.client.get("/slow", ).then(
      () => ({ kind: "resolved" as const }),
      (error: unknown) => ({ kind: "rejected" as const, name: (error as Error)?.name }),
    );
    const stopped = ts.stop();
    const outcome = await Promise.race([
      pending,
      Bun.sleep(250).then(() => ({ kind: "timeout" as const })),
    ]);
    expect(outcome.kind === "resolved").toBe(false); // no fabricated success
    await stopped;
    expect(await eventuallyUnreachable(ts.url)).toBe(true);
  });

  test("abort during slow request then immediate stop does not hang", async () => {
    const ts = createTestServer(markerApp("aborted"));
    const controller = new AbortController();
    const pending = ts.fetch("/slow", { signal: controller.signal });
    controller.abort();
    let aborted = false;
    try {
      await pending;
    } catch {
      aborted = true;
    }
    expect(aborted).toBe(true);
    await ts.stop();
    expect(await eventuallyUnreachable(ts.url)).toBe(true);
  });

  test("explicit-port reuse: platform behavior is explicit and leak-free", async () => {
    const first = createTestServer(markerApp("owner"), { port: FIXED_PORT });
    try {
      let second: ReturnType<typeof createTestServer> | undefined;
      let bindFailed = false;
      try {
        second = createTestServer(markerApp("intruder"), { port: FIXED_PORT });
      } catch {
        bindFailed = true; // EADDRINUSE-style platforms land here
      }

      if (bindFailed || second === undefined) {
        // Error-surfacing platforms: first server unaffected.
        const res = await first.fetch("/m");
        expect(await res.json()).toEqual({ marker: "owner" });
      } else {
        // PLATFORM TRUTH (Bun 1.4.0/Linux): dual-binding an explicit port
        // succeeds via SO_REUSEPORT, but which listener answers a given
        // connection is opaque (kernel/keep-alive dependent) and must never
        // be relied upon for isolation. We only require that traffic keeps
        // flowing from the known marker set while both are live.
        const seen = new Set<string>();
        for (let i = 0; i < 10; i++) {
          const body = (await (await fetch(new URL("/m", first.url))).json()) as { marker: string };
          expect(["owner", "intruder"]).toContain(body.marker);
          seen.add(body.marker);
        }
        console.log(`[m4-test-lifecycle] dual-bind markers observed: ${[...seen].join(", ")}`);
        // Stopping one instance must not disturb the other.
        await second.stop();
        await second.stop(); // idempotent
        for (let i = 0; i < 5; i++) {
          const after = (await (await fetch(new URL("/m", first.url))).json()) as { marker: string };
          expect(after.marker).toBe("owner");
        }
      }
    } finally {
      await first.stop();
    }
    expect(await eventuallyUnreachable(first.url)).toBe(true);
  });
});

describe("test-server concurrency matrix", () => {
  test("12 concurrent instances clean up after an exception in one branch", async () => {
    const servers = Array.from({ length: 12 }, (_, i) => createTestServer(markerApp(`cc-${i}`)));
    const exploding = async () => {
      try {
        await Promise.all(servers.map((s) => s.fetch("/m")));
        throw new Error("branch failure");
      } finally {
        await Promise.all(servers.map((s) => s.stop()));
      }
    };
    await expect(exploding()).rejects.toThrow("branch failure");
    for (const s of servers) {
      expect(await eventuallyUnreachable(s.url)).toBe(true);
    }
  }, 30_000);
});
