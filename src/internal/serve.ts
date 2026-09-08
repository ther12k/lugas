/** Native Bun server assembly for `app.serve()` (M1-015, M4R1-001, M7-004). */
import { defaultNotFound } from "./error-policy";
import { diagnostic } from "./diagnostics";
import { startLifecycle, type LugasLifecycle, type ShutdownOptions } from "./lifecycle";
import type { PreparedApp, SafeServeOptions } from "./prepared-app";

export type { SafeServeOptions } from "./prepared-app";
export type { LugasLifecycle, ShutdownOutcome, ShutdownOptions } from "./lifecycle";

/** Bun server augmented with the ADR-0020 lifecycle handle. */
export type LugasServer = Bun.Server<unknown> & { readonly lugasLifecycle: LugasLifecycle };

/**
 * Second-line fallback for a failing CUSTOM notFound policy (M6R2 #288),
 * mirroring the onError redaction contract from M6R1-008: throw, rejection,
 * or non-Response falls back to the default redacted 404 problem — never
 * Bun's development error page.
 */
function safeNotFound(
  policy: (request: Request) => Response | Promise<Response>,
): (request: Request) => Response | Promise<Response> {
  return (request: Request) => {
    if (policy === defaultNotFound) return defaultNotFound(request);
    try {
      const result = policy(request);
      if (!(result instanceof Response) && result != null && typeof (result as PromiseLike<unknown>).then === "function") {
        return Promise.resolve(result)
          .then((resolved) => (resolved instanceof Response ? resolved : defaultNotFound(request)))
          .catch(() => defaultNotFound(request));
      }
      return result instanceof Response ? result : defaultNotFound(request);
    } catch {
      return defaultNotFound(request);
    }
  };
}

/**
 * Starts a Bun server from the canonical prepared graph. Never reads user
 * configuration: routing structure was snapshotted, classified, and compiled
 * exactly once inside `defineApp()` (see prepareApp).
 *
 * Lifecycle (M7-004, ADR-0020): service `init` hooks start immediately and
 * Lugas handlers are gated on their completion (see prepareApp), so no Lugas
 * handler executes before the services it uses are ready. The server handle
 * gains `lugasLifecycle`: `ready`, idempotent `shutdown()` (stop accepting →
 * drain under deadline → reverse-order disposal → distinct outcomes),
 * `track()` for application work the drain must wait for, and opt-in
 * SIGINT/SIGTERM handling via `options.shutdown.signals`.
 */
export function serveApp(prepared: PreparedApp, options: SafeServeOptions = {}): LugasServer {
  const userFetch = options.fetch;
  const serverRef: { current: Bun.Server<unknown> | undefined } = { current: undefined };
  const lifecycle = startLifecycle({
    serverRef,
    services: prepared.lifecycleServices,
    serviceSlots: prepared.serviceSlots,
    options: options.shutdown,
    onStartupFailure: (error) => {
      console.error(`[lugas] service initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    },
  });
  // Hold traffic until initialization settles; a startup failure answers
  // held requests with a redacted 503 problem (see prepareApp gateHandler).
  prepared.trafficGate.gate = lifecycle.ready;

  // M7-003: the ceiling is the explicitly configured serve-time
  // `maxRequestBodySize`. Above-ceiling budgets are rejected at startup;
  // otherwise the ceiling slot enables clamping during enforcement.
  const ceiling = options.maxRequestBodySize;
  if (typeof ceiling === "number") {
    const over: string[] = [];
    if (prepared.budgets.appDefault !== undefined && prepared.budgets.appDefault > ceiling) {
      over.push(`application default ${prepared.budgets.appDefault}`);
    }
    for (const routeBudget of prepared.budgets.routeBudgets) {
      if (routeBudget > ceiling) over.push(`route budget ${routeBudget}`);
    }
    if (over.length > 0) {
      throw diagnostic("LUGAS_BODY_003", `serve(): body budget above the server ceiling (${ceiling}): ${over[0]}`, {
        hint: "an override relaxes the default, never the ceiling; lower the budget or raise maxRequestBodySize",
        context: { ceiling, count: over.length },
      });
    }
    prepared.budgets.ceilingRef.current = ceiling;
  }

  const server = Bun.serve({
    ...options,
    routes: prepared.bunRoutes,
    fetch: userFetch ?? ((request: Request) => safeNotFound(prepared.notFound)(request)),
  } as Bun.Serve.Options<any>) as Bun.Server<unknown>;
  serverRef.current = server;

  const lifecycleHandle: LugasLifecycle = {
    ready: lifecycle.ready,
    shutdown: (reason?: string) => lifecycle.shutdown(reason),
    track: (task: Promise<unknown>) => lifecycle.track(task),
  };
  const lugasServer = server as LugasServer;
  Object.defineProperty(lugasServer, "lugasLifecycle", {
    value: Object.freeze(lifecycleHandle),
    enumerable: false,
    writable: false,
  });
  return lugasServer;
}
