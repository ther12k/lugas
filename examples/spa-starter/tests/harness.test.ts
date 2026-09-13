/**
 * Failure-path tests for the measurement-harness process primitives
 * (CA-15). These run WITHOUT the starter being set up: they need only the
 * Bun runtime, the lib, and the fixture child scripts in fixtures/.
 *
 * Covered, per the owner review of #419:
 * - fragmented readiness output (one retained reader, complete-line assembly)
 * - a silent child (deadline fires while blocked on read; child killed)
 * - a hanging readiness response (per-attempt + total bounds actually bound)
 * - ignored SIGTERM (SIGTERM→SIGKILL escalation bounded)
 * plus: early-exit children, noisy non-matching output, graceful shutdown,
 * and non-2xx/hanging workload requests.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { fetchOk, fetchText, raceWithTimer, readinessOrigin, stopServer, waitForReady } from "../scripts/lib/server-process";

const FIXTURE = (name: string): string => join(import.meta.dir, "fixtures", name);
const spawnFixture = (name: string): Bun.Subprocess<"ignore", "pipe", "inherit"> =>
  Bun.spawn([process.execPath, FIXTURE(name)], { stdout: "pipe", stdin: "ignore" });

/** Fixtures that trap/act on SIGTERM emit READY once handlers are registered; signaling earlier would kill a half-booted child with the default action. */
const awaitFixtureReady = async (proc: Bun.Subprocess<"ignore", "pipe", "inherit">): Promise<void> => {
  const reader = proc.stdout.getReader();
  await reader.read();
  reader.releaseLock();
};

const READY_PATTERN = /LUGAS_STARTER_READY (\S+)/;

describe("harness failure paths (CA-15)", () => {
  test("fragmented readiness output: one reader assembles the line; origin only from a COMPLETE line", async () => {
    const proc = spawnFixture("fragmented-ready.ts");
    const t0 = performance.now();
    const origin = await readinessOrigin(proc, { pattern: READY_PATTERN, timeoutMs: 5_000 });
    const elapsed = performance.now() - t0;
    // The fixture first writes an unterminated "noise without a newline",
    // then the ready token split mid-word across writes. A partial-line
    // match or a second getReader() (locked stream) would fail here.
    expect(origin).toBe("http://127.0.0.1:5987");
    expect(elapsed).toBeGreaterThan(40); // the fixture's pauses actually elapsed
    const stop = await stopServer(proc, { graceMs: 2_000 });
    expect(stop).toEqual({ exitCode: 0, escalated: false });
  });

  test("silent child: the deadline fires WHILE blocked on read, and the child is killed", async () => {
    const proc = spawnFixture("silent-child.ts");
    const t0 = performance.now();
    await expect(readinessOrigin(proc, { pattern: READY_PATTERN, timeoutMs: 300 })).rejects.toThrow(/no complete readiness line within 300ms/);
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(280);
    expect(elapsed).toBeLessThan(3_000); // the check did not depend on a between-awaits poll
    // readinessOrigin must have killed the child: `exited` resolves quickly.
    const stop = await stopServer(proc, { graceMs: 500, killTimeoutMs: 500 });
    expect(stop.escalated).toBe(false);
  }, 10_000);

  test("child that exits before the line: fast EOF error, not a full-deadline wait", async () => {
    const proc = spawnFixture("exit-immediately.ts");
    const t0 = performance.now();
    await expect(readinessOrigin(proc, { pattern: READY_PATTERN, timeoutMs: 10_000 })).rejects.toThrow(/exited before emitting a complete readiness line/);
    expect(performance.now() - t0).toBeLessThan(3_000);
    await stopServer(proc, { graceMs: 500 }).catch(() => undefined);
  });

  test("noisy non-matching output never satisfies readiness; the deadline still fires", async () => {
    const proc = spawnFixture("noisy-child.ts");
    const t0 = performance.now();
    await expect(readinessOrigin(proc, { pattern: READY_PATTERN, timeoutMs: 300 })).rejects.toThrow(/no complete readiness line within 300ms/);
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(280);
    expect(elapsed).toBeLessThan(3_000);
    await stopServer(proc, { graceMs: 500, killTimeoutMs: 500 }).catch(() => undefined);
  }, 10_000);

  test("hanging readiness response: bounded per attempt AND in total", async () => {
    let requests = 0;
    const server = Bun.serve({
      port: 0,
      fetch: () => {
        requests += 1;
        return new Promise(() => {}); // accepts, never responds
      },
    });
    const t0 = performance.now();
    try {
      await expect(
        waitForReady(`http://127.0.0.1:${server.port}`, { path: "/api/ready", timeoutMs: 300, attemptTimeoutMs: 80, intervalMs: 20 }),
      ).rejects.toThrow(/never answered 200 within 300ms/);
    } finally {
      server.stop(true);
    }
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(280);
    expect(elapsed).toBeLessThan(4_000); // each hanging attempt was bounded at ~80ms, not infinite
    expect(requests).toBeGreaterThanOrEqual(2); // the loop kept polling after bounded failures
  }, 10_000);

  test("waitForReady: 5xx responses keep polling; a 200 with a consumed body resolves", async () => {
    let attempts = 0;
    const server = Bun.serve({
      port: 0,
      fetch: () => {
        attempts += 1;
        if (attempts < 3) return new Response("warming up", { status: 503 });
        return Response.json({ ok: true });
      },
    });
    try {
      await waitForReady(`http://127.0.0.1:${server.port}`, { path: "/api/ready", timeoutMs: 5_000, attemptTimeoutMs: 500, intervalMs: 10 });
      expect(attempts).toBeGreaterThanOrEqual(3);
    } finally {
      server.stop(true);
    }
  });

  test("ignored SIGTERM: stopServer escalates to SIGKILL within its bound", async () => {
    const proc = spawnFixture("ignore-sigterm.ts");
    await awaitFixtureReady(proc);
    const t0 = performance.now();
    const stop = await stopServer(proc, { graceMs: 200, killTimeoutMs: 1_000 });
    const elapsed = performance.now() - t0;
    expect(stop.escalated).toBe(true);
    expect(Number.isInteger(stop.exitCode)).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(190);
    expect(elapsed).toBeLessThan(3_000);
  }, 10_000);

  test("graceful SIGTERM: the real exit code is retained without escalation", async () => {
    const proc = spawnFixture("exit-on-sigterm.ts");
    await awaitFixtureReady(proc);
    const stop = await stopServer(proc, { graceMs: 2_000 });
    expect(stop).toEqual({ exitCode: 0, escalated: false });
  });

  test("stopServer on an already-exited child is a safe no-op", async () => {
    const proc = spawnFixture("exit-immediately.ts");
    await proc.exited;
    const stop = await stopServer(proc, { graceMs: 500 });
    expect(Number.isInteger(stop.exitCode)).toBe(true);
    expect(stop.escalated).toBe(false);
  });

  test("fetchOk: consumes the body, rejects non-2xx, and cannot hang on a stalled body", async () => {
    const server = Bun.serve({
      port: 0,
      fetch: (req) => {
        const path = new URL(req.url).pathname;
        if (path === "/ok") return Response.json({ value: 1 });
        if (path === "/bad") return new Response("nope", { status: 404 });
        return new Promise(() => {}); // /stall
      },
    });
    const base = `http://127.0.0.1:${server.port}`;
    try {
      const res = await fetchOk(`${base}/ok`);
      expect(res.ok).toBe(true);
      await expect(fetchOk(`${base}/bad`)).rejects.toThrow(/failed: 404/);
      const t0 = performance.now();
      await expect(fetchOk(`${base}/stall`, { timeoutMs: 150 })).rejects.toThrow(/exceeded 150ms/);
      expect(performance.now() - t0).toBeLessThan(2_000);
      await expect(fetchText(`${base}/stall`, { timeoutMs: 150 })).rejects.toThrow(/exceeded 150ms/);
    } finally {
      server.stop(true);
    }
  });

  test("raceWithTimer: the losing promise's late rejection does not escape", async () => {
    const slow = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("late")), 50));
    await expect(raceWithTimer(slow, 10, "timer won")).rejects.toThrow("timer won");
    await new Promise((resolve) => setTimeout(resolve, 100)); // let the late rejection fire; must be handled
    const value = await raceWithTimer(Promise.resolve(7), 100, "unused");
    expect(value).toBe(7);
  });
});
