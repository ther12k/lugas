/**
 * Deployment smoke: real SIGTERM/SIGKILL termination in an unprivileged
 * container (#448).
 *
 * The lifecycle suite (lifecycle.test.ts) drives shutdown() in-process;
 * this suite proves the same lifecycle behaves when the deployment
 * environment drives it: a real Bun server inside an unprivileged container
 * (user 1000:1000, repository mounted read-only), readiness probed over a
 * real socket, SIGTERM delivered by the container runtime, and a bounded
 * termination window: every probe fetch carries a timeout, and overrun is
 * reaped with `docker rm -f` (which stops the CONTAINER — killing the
 * `docker run` client alone would leave it running on the host loopback).
 *
 * Skips cleanly when Docker is unusable or the pinned oven/bun:1.4.0-alpine
 * image is unavailable. Note: the hosted verify job runs this suite and
 * skips it (no Docker image there); the container rows execute only on a
 * local Docker host (erratum, docs/reports/issues/448.md).
 */
import { describe, expect, afterAll, test } from "bun:test";
import { resolve } from "node:path";
import { probeDrainSocket } from "./deployment-failures.test";

const ROOT = resolve(import.meta.dir, "../..");
const IMAGE = "oven/bun:1.4.0-alpine";
const PROBE_TIMEOUT_MS = 5_000;
// Long-lived SSE streams must NOT carry the short probe timeout: a timed-out
// fetch cancels the stream client-side, which is exactly the cleanup path the
// held-stream row must NOT trigger. Bound them loosely against the watchdog.
const STREAM_TIMEOUT_MS = 40_000;

function dockerAvailable(): boolean {
  if (Bun.which("docker") === null) return false;
  const proc = Bun.spawnSync(["docker", "info"], {
    stdout: "pipe",
    stderr: "pipe",
    timeout: 10_000,
  });
  return proc.exitCode === 0;
}

function imagePresent(): boolean {
  if (!dockerAvailable()) return false;
  const proc = Bun.spawnSync(["docker", "image", "inspect", IMAGE], { stdout: "pipe", stderr: "pipe", timeout: 10_000 });
  return proc.exitCode === 0;
}

const suiteEnabled = dockerAvailable() && imagePresent();
const containersToClean: string[] = [];

function forceRemoveContainer(name: string): void {
  // `docker rm -f` stops and removes the container itself — the watchdog and
  // the finally blocks must reap the container, not merely the client
  // process (`docker run` killed client-side leaves the container running).
  Bun.spawnSync(["docker", "rm", "-f", name], { stdout: "pipe", stderr: "pipe", timeout: 10_000 });
}

afterAll(async () => {
  for (const name of containersToClean) {
    forceRemoveContainer(name);
  }
});

interface ContainerRun {
  name: string;
  proc: Bun.Subprocess<"ignore", "pipe", "pipe">;
  output: string;
  done: Promise<void>;
}

function runServerContainer(fixture: string): ContainerRun {
  const name = `lugas-448-${Math.random().toString(36).slice(2, 8)}`;
  containersToClean.push(name);
  // --network host keeps the probe simple and honest: the READY port the
  // fixture prints is this host's loopback. --user keeps the server
  // unprivileged; the repository mount is read-only.
  const proc = Bun.spawn(
    [
      "docker", "run", "--rm", "--name", name,
      "--user", "1000:1000",
      "--network", "host",
      "--volume", `${ROOT}:/repo:ro`,
      IMAGE,
      "run", `/repo/${fixture}`,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const run: ContainerRun = { name, proc, output: "", done: undefined as unknown as Promise<void> };
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  run.done = (async () => {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      run.output += decoder.decode(chunk.value, { stream: true });
    }
  })();
  return run;
}

/** Wait until the accumulated stdout matches the pattern or the bound expires. */
async function waitForOutput(run: ContainerRun, pattern: RegExp, boundMs: number): Promise<string> {
  const deadline = Date.now() + boundMs;
  for (;;) {
    const match = pattern.exec(run.output);
    if (match !== null) return run.output;
    if (Date.now() > deadline) throw new Error(`container output never matched ${pattern}; got: ${run.output.slice(-400)}`);
    await Bun.sleep(50);
  }
}

describe.skipIf(!suiteEnabled)("deployment smoke: unprivileged container (#448)", () => {
  test(
    "SIGTERM drains a ready container cleanly: readiness flaps off, services dispose once, exit 0",
    async () => {
      const run = runServerContainer("tests/lifecycle/fixtures/container-server.ts");
      const watchdog = setTimeout(() => forceRemoveContainer(run.name), 30_000);
      try {
        // starting → ready: the READY line plus real 200 probes.
        const readyText = await waitForOutput(run, /^READY (\d+)\r?\n/m, 20_000);
        const port = /^READY (\d+)\r?\n/m.exec(readyText)![1]!;
        const base = `http://127.0.0.1:${port}`;
        const ready = await fetch(`${base}/ready`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
        expect(ready.status).toBe(200);
        expect(await ready.json()).toEqual({ status: "ready" });
        const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
        expect(health.status).toBe(200);
        expect(await health.json()).toEqual({ status: "ok" });

        // A live SSE stream the client closes BEFORE the signal: the
        // cleanup below therefore proves the disconnect path, not the
        // shutdown path (the shutdown-time cleanup is the held-stream row).
        const stream = await fetch(`${base}/events`, { signal: AbortSignal.timeout(STREAM_TIMEOUT_MS) });
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

        // The client closes its stream first: with no in-flight work, the
        // drain completes inside the default budget and services dispose.
        reader.cancel().catch(() => {});
        await readerSettled;

        // The deployment environment drives shutdown with SIGTERM.
        const signaled = Bun.spawnSync(["docker", "kill", "--signal=TERM", run.name], { stdout: "pipe", stderr: "pipe", timeout: 10_000 });
        expect(signaled.exitCode).toBe(0);

        // draining: wait for the fixture's own SIGTERM marker. It is
        // registered after app.serve(), so the lifecycle handler's
        // synchronous stop() has already run — without this, probing too
        // early could observe a still-accepting port and fail spuriously.
        await waitForOutput(run, /^SIGTERM-HANDLED\r?\n/m, 10_000);

        // Now the port must have actively refused connections (refusal, not timeout).
        const drainProbe = await probeDrainSocket(`${base}/ready`, PROBE_TIMEOUT_MS);
        expect(drainProbe).toBe("connection-refused");

        // stopped: bounded termination window, exit code 0, dispose-once.
        const exitCode = await run.proc.exited;
        expect(exitCode).toBe(0);
        await Promise.race([run.done, Bun.sleep(2_000)]);
        expect(run.output).toContain("SSE-CLEANUP");
        expect(run.output.split(/\r?\n/).filter((line) => line === "DISPOSED")).toHaveLength(1);
      } finally {
        clearTimeout(watchdog);
        forceRemoveContainer(run.name);
        await run.proc.exited;
      }
    },
    60_000,
  );

  test(
    "a stream still open at SIGTERM runs its shutdown-time cleanup, but the budget expires: exit 0 with disposal withheld (observed fail-mode)",
    async () => {
      const run = runServerContainer("tests/lifecycle/fixtures/container-server.ts");
      const watchdog = setTimeout(() => forceRemoveContainer(run.name), 45_000);
      try {
        const readyText = await waitForOutput(run, /^READY (\d+)\r?\n/m, 20_000);
        const port = /^READY (\d+)\r?\n/m.exec(readyText)![1]!;
        const stream = await fetch(`http://127.0.0.1:${port}/events`, { signal: AbortSignal.timeout(STREAM_TIMEOUT_MS) });
        const reader = stream.body!.getReader();
        const first = await reader.read();
        expect(new TextDecoder().decode(first.value!)).toContain("event: init");

        // SIGTERM with the stream deliberately left open.
        const signaled = Bun.spawnSync(["docker", "kill", "--signal=TERM", run.name], { stdout: "pipe", stderr: "pipe", timeout: 10_000 });
        expect(signaled.exitCode).toBe(0);
        await waitForOutput(run, /^SIGTERM-HANDLED\r?\n/m, 10_000);

        // Observed (Bun 1.4.0, default 10s budget): the open stream holds
        // the shutdown until the budget expires, the SSE cleanup runs at
        // shutdown time, and the process still exits 0 — with services NOT
        // disposed. This row documents the fail-mode for runbooks;
        // disposal-withheld semantics are pinned in-process by the
        // lifecycle suite.
        const exitCode = await run.proc.exited;
        expect(exitCode).toBe(0);
        await Promise.race([run.done, Bun.sleep(2_000)]);
        expect(run.output).toContain("SSE-CLEANUP");
        expect(run.output.split(/\r?\n/).filter((line) => line === "DISPOSED")).toHaveLength(0);
        reader.cancel().catch(() => {});
      } finally {
        clearTimeout(watchdog);
        forceRemoveContainer(run.name);
        await run.proc.exited;
      }
    },
    60_000,
  );

  test(
    "failed startup exits non-zero, rolls back initialized services, never prints READY",
    async () => {
      const run = runServerContainer("tests/lifecycle/fixtures/container-fail-init.ts");
      const watchdog = setTimeout(() => forceRemoveContainer(run.name), 30_000);
      try {
        const exitCode = await Promise.race([
          run.proc.exited,
          Bun.sleep(20_000).then(() => { throw new Error("failed-startup container never exited within the bound"); }),
        ]);
        await Promise.race([run.done, Bun.sleep(2_000)]);
        expect(exitCode).not.toBe(0);
        expect(run.output).toContain("INIT-OK");
        expect(run.output).toContain("ROLLBACK-DISPOSED");
        expect(run.output).not.toContain("READY");
        // No lingering container from the failed run (--rm + exit).
        const listed = Bun.spawnSync(["docker", "ps", "-q", "--filter", `name=${run.name}`], { stdout: "pipe", stderr: "pipe", timeout: 10_000 });
        expect(new TextDecoder().decode(listed.stdout).trim()).toBe("");
      } finally {
        clearTimeout(watchdog);
        forceRemoveContainer(run.name);
        await run.proc.exited;
      }
    },
    60_000,
  );
});
