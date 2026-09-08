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
  readonly track: (task: Promise<unknown>) => void;
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
      shutdownPromise = (async (): Promise<ShutdownOutcome> => {
        // Opt-in signal listeners ride the same path; remove them at shutdown.
        if (input.options?.signals === true) {
          process.off("SIGINT", signalHandler);
          process.off("SIGTERM", signalHandler);
        }
        // Phase 1: stop accepting new work.
        input.serverRef.current?.stop();
        const connectionsClosed = true;

        // Never dispose while initialization is still in flight; a startup
        // failure surfaces through `ready` (and its rollback disposal).
        await initPromise.then(() => undefined, () => undefined);

        // Phase 2: drain in-flight requests and tracked tasks under the deadline.
        const deadline = Date.now() + deadlineMs;
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

        // Phase 3: reverse-order disposal; report every failure.
        const disposalFailures: Array<{ service: string; message: string }> = [];
        for (let i = initialized.length - 1; i >= 0; i -= 1) {
          const svc = initialized[i]!;
          try {
            await svc.dispose?.(svc.value);
          } catch (error) {
            disposalFailures.push({ service: svc.name, message: error instanceof Error ? error.message : String(error) });
          }
        }
        outcome = Object.freeze({
          connectionsClosed,
          trackedWorkCompleted: true,
          disposalCompleted: true,
          cooperated: true,
          deadlineExpired: false,
          disposalFailures: Object.freeze(disposalFailures),
        });
        return outcome;
      })();
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
