/**
 * Bounded process-management primitives for the measurement harness and
 * tests (CA-15 follow-up to the CA-14 harness repair).
 *
 * The CA-14 harness had three failure paths that could hang forever:
 * - a fresh stdout reader was acquired per readiness-loop iteration, so a
 *   readiness line split across chunks threw a locked-stream TypeError on
 *   the second read;
 * - deadlines were checked between awaits, so a silent child, a stalled
 *   readiness response, or an unread body blocked before the next check;
 * - shutdown awaited `proc.exited` unconditionally, so a child ignoring
 *   SIGTERM hung the cleanup.
 *
 * These helpers close all three: one retained reader with complete-line
 * assembly, deadlines enforced inside every await (each await is raced
 * against a firing timer), and SIGTERM→SIGKILL escalation with its own
 * bound.
 */

/** Structural view of a spawned child; satisfied by Bun.Subprocess with piped stdout.
 * kill's return is declared void so both Bun type generations (number and void) conform. */
export interface ManagedProcess {
  readonly stdout: ReadableStream<Uint8Array>;
  readonly exited: Promise<number>;
  kill(signal?: number | string): void;
}

/** Race `promise` against a timer that actually fires while we await it. */
export function raceWithTimer<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface ReadinessOptions {
  /** Matched against COMPLETE lines only; must expose the origin as capture group 1. */
  pattern: RegExp;
  /** Total budget for a complete, matching line (a firing timer, not a between-awaits check). */
  timeoutMs: number;
}

/**
 * Resolve the server origin from the child's stdout, matching `pattern`
 * against complete (newline-terminated) lines only. Uses exactly one
 * reader for the whole wait, so output fragmented across any number of
 * chunks is assembled safely. On timeout or early exit the child is
 * killed before the error propagates — no failure path leaks it.
 */
export async function readinessOrigin(
  proc: ManagedProcess,
  { pattern, timeoutMs }: ReadinessOptions,
): Promise<string> {
  // A /g regex would carry lastIndex between line matches; strip it.
  const line = new RegExp(pattern.source, pattern.flags.replace("g", ""));
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let deadlineFired = false;
  let clearDeadline: () => void = () => undefined;
  const deadline = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      deadlineFired = true;
      reject(new Error(`no complete readiness line within ${timeoutMs}ms`));
    }, timeoutMs);
    clearDeadline = () => clearTimeout(timer);
  });

  try {
    for (;;) {
      const chunk = await Promise.race([reader.read(), deadline]);
      if (chunk.done) throw new Error("child exited before emitting a complete readiness line");
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!; // trailing segment after the last newline is incomplete
      for (const complete of lines) {
        const match = line.exec(complete.replace(/\r$/, ""));
        if (match?.[1]) return match[1];
      }
    }
  } catch (error) {
    try {
      proc.kill(deadlineFired ? "SIGKILL" : "SIGTERM");
    } catch {
      // already dead — nothing to clean up
    }
    throw error;
  } finally {
    clearDeadline();
    try {
      await reader.cancel();
    } catch {
      // stream already closed
    }
  }
}

export interface ReadyProbeOptions {
  path: string;
  /** Total budget for a 200 with a fully consumed body. */
  timeoutMs: number;
  /** Bound for ONE attempt (fetch + body consume); default 2 000 ms. */
  attemptTimeoutMs?: number;
  /** Pause between attempts; default 5 ms. */
  intervalMs?: number;
}

/**
 * Poll until `path` answers 200 with a fully consumed body. Every attempt
 * — including the body read — is bounded, so a server that accepts and
 * never responds cannot stall the loop past one attempt duration; the
 * total deadline is then checked between attempts. Worst-case overshoot
 * beyond timeoutMs is one attempt.
 */
export async function waitForReady(baseUrl: string, options: ReadyProbeOptions): Promise<void> {
  const { path, timeoutMs } = options;
  const attemptTimeoutMs = options.attemptTimeoutMs ?? 2_000;
  const intervalMs = options.intervalMs ?? 5;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const ok = await attemptOnce(`${baseUrl}${path}`, attemptTimeoutMs);
    if (ok) return;
    if (Date.now() >= deadline) {
      throw new Error(`${path} never answered 200 within ${timeoutMs}ms (attempts bounded at ${attemptTimeoutMs}ms each)`);
    }
    await sleep(intervalMs);
  }
}

const attemptOnce = async (url: string, attemptTimeoutMs: number): Promise<boolean> => {
  try {
    return await raceWithTimer(
      (async () => {
        const res = await fetch(url, { signal: AbortSignal.timeout(attemptTimeoutMs) });
        await res.arrayBuffer(); // consume regardless of status: no half-read bodies
        return res.ok;
      })(),
      attemptTimeoutMs + 250,
      `readiness attempt exceeded ${attemptTimeoutMs}ms: ${url}`,
    );
  } catch {
    return false; // transport error, non-2xx, or attempt timeout — keep polling
  }
};

export interface StopOptions {
  /** Grace period for a clean SIGTERM exit; default 5 000 ms. */
  graceMs?: number;
  /** Bound for the SIGKILL escalation; default 2 000 ms. */
  killTimeoutMs?: number;
}

export interface StopResult {
  /** The child's real exit result (code or signal-derived value). */
  exitCode: number;
  /** True when SIGTERM timed out and SIGKILL was required. */
  escalated: boolean;
}

/**
 * Terminate the child with SIGTERM; if it is still alive after `graceMs`,
 * escalate to SIGKILL bounded by `killTimeoutMs`. Resolves with the real
 * exit result in every case, or throws only if the child survives even
 * SIGKILL. Safe to call on an already-exited child (kill is a no-op and
 * `exited` resolves immediately).
 */
export async function stopServer(proc: ManagedProcess, options: StopOptions = {}): Promise<StopResult> {
  const graceMs = options.graceMs ?? 5_000;
  const killTimeoutMs = options.killTimeoutMs ?? 2_000;
  proc.kill("SIGTERM");
  try {
    return { exitCode: await raceWithTimer(proc.exited, graceMs, `child ignored SIGTERM for ${graceMs}ms`), escalated: false };
  } catch {
    // fall through to escalation
  }
  proc.kill("SIGKILL");
  return { exitCode: await raceWithTimer(proc.exited, killTimeoutMs, "child survived SIGKILL"), escalated: true };
}

export interface FetchOptions {
  /** Bound for the fetch AND the body consume; default 10 000 ms. */
  timeoutMs?: number;
}

/**
 * GET `url`, require 2xx, and fully consume the body — all bounded. A
 * stalled response or unread body cannot hang the caller.
 */
export async function fetchOk(url: string, options: FetchOptions = {}): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  return raceWithTimer(
    (async () => {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) }).catch((error: unknown) => {
        throw asTimeoutError(error, url, timeoutMs);
      });
      await res.arrayBuffer().catch((error: unknown) => {
        throw asTimeoutError(error, url, timeoutMs);
      });
      if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
      return res;
    })(),
    timeoutMs + 250,
    `GET ${url} exceeded ${timeoutMs}ms (fetch or body consume)`,
  );
}

/** GET `url`, require 2xx, and return the body as text — all bounded. */
export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  return raceWithTimer(
    (async () => {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) }).catch((error: unknown) => {
        throw asTimeoutError(error, url, timeoutMs);
      });
      if (!res.ok) {
        await res.arrayBuffer();
        throw new Error(`GET ${url} failed: ${res.status}`);
      }
      return res.text();
    })(),
    timeoutMs + 250,
    `GET ${url} exceeded ${timeoutMs}ms (fetch or body read)`,
  );
}

/** AbortSignal.timeout surfaces as a bare DOMException ("The operation timed out."); give it request context. */
const asTimeoutError = (error: unknown, url: string, timeoutMs: number): unknown => {
  const name = error instanceof Error ? error.name : "";
  return name === "TimeoutError" || name === "AbortError"
    ? new Error(`GET ${url} exceeded ${timeoutMs}ms (fetch or body consume)`)
    : error;
};
