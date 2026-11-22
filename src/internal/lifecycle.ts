/**
 * Application lifecycle coordinator (M7-004, ADR-0020).
 *
 * Ordered shutdown: stop accepting → drain in-flight requests and tracked
 * tasks under a deadline → reverse-order disposal → report. Three outcomes
 * are reported distinctly and never collapse into one "stopped" boolean.
 * When the deadline expires with work remaining, the outcome is unsuccessful
 * (`cooperated: false`): connections are force-closed but services in use by
 * continuing work are deliberately NOT disposed — no fabricated success and
 * no resource closed underneath live work. The guarantee covers tracked work
 * only (in-flight requests plus tasks registered through `track`); detached
 * application work is the application's or supervisor's responsibility.
 */
import type { ServiceDescriptor } from "../core/service";

export type LifecycleService = {
  readonly name: string;
  readonly value: unknown;
  readonly init: ((value: unknown) => void | Promise<void>) | undefined;
  readonly dispose: ((value: unknown) => void | Promise<void>) | undefined;
};

export type ShutdownOutcome = {
  /** Phase 1 completed: the server stopped accepting new work. */
  readonly connectionsClosed: boolean;
  /** Phase 2 completed within the deadline: requests and tracked tasks settled. */
  readonly trackedWorkCompleted: boolean;
  /** Phase 3 completed: services disposed in reverse initialization order. */
  readonly disposalCompleted: boolean;
  /** `false` only when the deadline expired with tracked work remaining. */
  readonly cooperated: boolean;
  readonly deadlineExpired: boolean;
  readonly disposalFailures: ReadonlyArray<{ readonly service: string; readonly message: string }>;
};

export type LugasLifecycle = {
  /** Resolves when all service `init` hooks completed; rejects after startup failure. */
  readonly ready: Promise<void>;
  /** Idempotent: every call resolves with the SAME outcome object. */
  readonly shutdown: (reason?: string) => Promise<ShutdownOutcome>;
  /** Registers application work the drain must wait for. */
  /** The drain waits for every tracked task (ADR-0020); passing the request (M9-006, ADR-0032) additionally correlates it with that request's telemetry end event. */
  readonly track: (task: Promise<unknown>, request?: Request) => void;
};

export type ShutdownOptions = {
  /** Drain deadline in milliseconds. Default 10_000. */
  readonly drainDeadlineMs?: number;
  /** Opt-in SIGINT/SIGTERM handling; off by default, never on import. */
  readonly signals?: boolean;
};

const DEFAULT_DRAIN_DEADLINE_MS = 10_000;
const DRAIN_POLL_MS = 15;

function pendingRequestCount(server: Bun.Server<unknown> | undefined): number {
  const count = (server as unknown as { pendingRequests?: unknown } | undefined)?.pendingRequests;
  return typeof count === "number" ? count : 0;
}

/**
 * Races `promise` against an absolute deadline timestamp. On timeout the
 * result is `onDeadline()` and the underlying operation is left running —
 * a race only stops waiting, it does not terminate work; the process
 * supervisor remains the final boundary. The timer is cleared when the
 * promise settles first, so no dangling timer outlives the race.
 */
function raceDeadline<T>(promise: PromiseLike<T>, deadline: number, onDeadline: () => T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(onDeadline()), Math.max(0, deadline - Date.now()));
    const settle = (value: T): void => {
      clearTimeout(timer);
      resolve(value);
    };
    Promise.resolve(promise).then(settle, (error: unknown) => {
      // Both call sites pre-map rejections into values; reaching here means
      // that mapping has a bug. Resolve the race (never leave it pending)
      // and re-surface the error asynchronously so it is not swallowed.
      settle(onDeadline());
      queueMicrotask(() => {
        throw error;
      });
    });
  });
}

export type CoordinatorInput = {
  /**
   * Mutable reference to the Bun server. `serveApp()` fills it immediately
   * after `Bun.serve()` returns; shutdown only ever runs afterwards, so the
   * reference is always present when read.
   */
  readonly serverRef: { current: Bun.Server<unknown> | undefined };
  readonly services: ReadonlyArray<LifecycleService>;
  /** Slot map handlers read from; entries are filled as each init resolves. */
  readonly serviceSlots: Record<string, unknown>;
  readonly options: ShutdownOptions | undefined;
  readonly onStopAccepting: (() => void) | undefined;
  readonly onStartupFailure: (error: unknown) => void;
};

export function startLifecycle(input: CoordinatorInput): LugasLifecycle {
  const slots = input.serviceSlots as Record<string, unknown>;
  const deadlineMs = input.options?.drainDeadlineMs ?? DEFAULT_DRAIN_DEADLINE_MS;

  let initialized: LifecycleService[] = [];
  const initPromise = (async (): Promise<void> => {
    for (const svc of input.services) {
      try {
        await svc.init?.(svc.value);
      } catch (error) {
        input.onStartupFailure(error);
        // Reverse-order disposal of already-initialized services, then propagate.
        for (let i = initialized.length - 1; i >= 0; i -= 1) {
          const done = initialized[i]!;
          try {
            await done.dispose?.(done.value);
          } catch {
            // Disposal failures during startup rollback surface via ready rejection path only.
          }
        }
        initialized = []; // rolled back; a later shutdown must not dispose twice
        throw error;
      }
      slots[svc.name] = svc.value;
      initialized = initialized.concat(svc);
    }
  })();

  const tracked = new Set<Promise<unknown>>();
  let outcome: ShutdownOutcome | undefined;
  let shutdownPromise: Promise<ShutdownOutcome> | undefined;

  const signalHandler = (): void => {
    void lifecycle.shutdown("signal");
  };

  const lifecycle: LugasLifecycle = {
    ready: initPromise,

    track(task: Promise<unknown>): void {
      if (outcome !== undefined) return; // shutdown already finished; nothing new is accounted
      tracked.add(task);
      void task.catch(() => undefined).then(() => tracked.delete(task));
    },

    shutdown(_reason?: string): Promise<ShutdownOutcome> {
      if (shutdownPromise !== undefined) return shutdownPromise;
      // Reserve the shared promise before transport close callbacks can re-enter shutdown.
      const shutdown = Promise.withResolvers<ShutdownOutcome>();
      shutdownPromise = shutdown.promise;
      void (async (): Promise<ShutdownOutcome> => {
        // Opt-in signal listeners ride the same path; remove them at shutdown.
        if (input.options?.signals === true) {
          process.off("SIGINT", signalHandler);
          process.off("SIGTERM", signalHandler);
        }
        // Phase 1: stop accepting new work.
        input.serverRef.current?.stop();
        input.onStopAccepting?.();
        const connectionsClosed = true;

        // The deadline is ONE budget over the whole shutdown: waiting for
        // initialization, draining, and disposal. A hanging initializer or
        // disposer must still produce an honest outcome instead of a
        // shutdown that never returns (ADR-0020 deadline invariant).
        const deadline = Date.now() + deadlineMs;

        // Never dispose while initialization is still in flight; a startup
        // failure surfaces through `ready` (and its rollback disposal).
        const initSettled = await raceDeadline(
          initPromise.then(() => true, () => true),
          deadline,
          () => false,
        );
        if (!initSettled) {
          // Initialization never settled within the budget: force-close and
          // report — a half-initialized service set cannot be disposed
          // honestly (which services finished is unknowable).
          input.serverRef.current?.stop(true);
          outcome = Object.freeze({
            connectionsClosed,
            trackedWorkCompleted: false,
            disposalCompleted: false,
            cooperated: false,
            deadlineExpired: true,
            disposalFailures: [],
          });
          return outcome;
        }

        // Phase 2: drain in-flight requests and tracked tasks under the deadline.
        let drained = false;
        for (;;) {
          const requestsDone = pendingRequestCount(input.serverRef.current) === 0;
          const tasksDone = tracked.size === 0;
          if (requestsDone && tasksDone) {
            drained = true;
            break;
          }
          if (Date.now() >= deadline) break;
          await Bun.sleep(DRAIN_POLL_MS);
        }

        if (!drained) {
          // Deadline expired: force-close connections, keep resources intact.
          input.serverRef.current?.stop(true);
          outcome = Object.freeze({
            connectionsClosed,
            trackedWorkCompleted: false,
            disposalCompleted: false,
            cooperated: false,
            deadlineExpired: true,
            disposalFailures: [],
          });
          return outcome;
        }

        // Phase 3: reverse-order disposal; report every failure. Each
        // dispose runs against whatever budget remains; one that never
        // settles is reported, remaining services are recorded as not
        // disposed, and the outcome stays honest.
        const disposalFailures: Array<{ service: string; message: string }> = [];
        let disposalExpired = false;
        for (let i = initialized.length - 1; i >= 0; i -= 1) {
          const svc = initialized[i]!;
          if (disposalExpired) {
            disposalFailures.push({ service: svc.name, message: "dispose not attempted: shutdown deadline expired" });
            continue;
          }
          const result = await raceDeadline(
            Promise.resolve(svc.dispose?.(svc.value)).then(
              () => ({ expired: false, failure: null as { service: string; message: string } | null }),
              (error: unknown) => ({
                expired: false,
                failure: { service: svc.name, message: error instanceof Error ? error.message : String(error) },
              }),
            ),
            deadline,
            () => ({
              expired: true,
              failure: { service: svc.name, message: "dispose did not settle within the shutdown deadline" },
            }),
          );
          if (result.failure !== null) disposalFailures.push(result.failure);
          if (result.expired) disposalExpired = true;
        }
        outcome = Object.freeze({
          connectionsClosed,
          trackedWorkCompleted: true,
          disposalCompleted: !disposalExpired,
          cooperated: !disposalExpired,
          deadlineExpired: disposalExpired,
          disposalFailures: Object.freeze(disposalFailures),
        });
        return outcome;
      })().then(shutdown.resolve, shutdown.reject);
      return shutdownPromise;
    },
  };

  // Signal handling is opt-in per ADR-0020; importing Lugas installs nothing.
  if (input.options?.signals === true) {
    process.on("SIGINT", signalHandler);
    process.on("SIGTERM", signalHandler);
  }

  return lifecycle;
}

export type { ServiceDescriptor };
