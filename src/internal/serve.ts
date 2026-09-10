/** Native Bun server assembly for `app.serve()` (M1-015, M4R1-001, M7-004). */
import { defaultNotFound } from "./error-policy";
import { diagnostic } from "./diagnostics";
import { corsWrapFallback } from "./cors";
import { wrapLogFallback } from "./logging";
import { startLifecycle, type LugasLifecycle, type ShutdownOptions } from "./lifecycle";
import { applySecureHeaders } from "./production";
import { telemetryTrackTask, wrapTelemetryFallback } from "./telemetry";
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
  prepared.trafficGate.settled = false;
  void lifecycle.ready.then(
    () => {
      prepared.trafficGate.settled = true;
    },
    () => {
      prepared.trafficGate.settled = false; // startup failure: readiness stays 503
    },
  );

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

  // M8-001 (ADR-0022): the CORS policy also covers the fetch fallback —
  // unmatched paths AND method-mismatched requests (including preflights on
  // paths without a declared OPTIONS entry) arrive here through Bun's own
  // routing. A user-supplied fetch is wrapped with the same policy.
  // M8-003 (ADR-0024): logging wraps inside CORS (outermost stays CORS so
  // preflights are not access-logged) and outside the fallback logic.
  // M9-004: the not-found fallback is a pipeline response, so the
  // secure-headers policy covers it (fill-if-absent, ADR-0029).
  const secureFallback = prepared.secureHeaders !== undefined && userFetch === undefined
    ? (request: Request): Response | Promise<Response> => {
        const out: Response | Promise<Response> = safeNotFound(prepared.notFound)(request);
        return out instanceof Response ? applySecureHeaders(prepared.secureHeaders!, out) : Promise.resolve(out).then((r) => applySecureHeaders(prepared.secureHeaders!, r));
      }
    : undefined;
  const plainFallback = secureFallback ?? ((request: Request) => safeNotFound(prepared.notFound)(request));
  // M9-006 (ADR-0032): the not-found fallback reports telemetry too
  // (route "-"); request ids reuse the logging pipeline's convention.
  const baseFetchUnwrapped: (request: Request, server: Bun.Server<unknown>) => Response | Promise<Response> =
    userFetch ?? plainFallback;
  const baseFetch =
    prepared.telemetry !== undefined && userFetch === undefined
      ? wrapTelemetryFallback(prepared.telemetry, prepared.telemetryRegistry, undefined, baseFetchUnwrapped)
      : baseFetchUnwrapped;
  const loggedFetch = prepared.logging !== undefined ? wrapLogFallback(prepared.logging, baseFetch) : baseFetch;
  const fetchHandler = prepared.cors !== undefined ? corsWrapFallback(prepared.cors, loggedFetch) : loggedFetch;

  // M9-003 (ADR-0028): one Bun websocket handler multiplexes every websocket
  // route through the upgrade data key. An application-supplied `websocket`
  // option would shadow the compiled routes, so the conflict fails closed.
  const wsHub = prepared.websocketHub;
  if (wsHub !== null && options.websocket !== undefined) {
    throw diagnostic("LUGAS_WS_002", "serve(): custom 'websocket' option conflicts with declared websocket() routes", {
      hint: "websocket routes are served by Lugas; handle sockets in the route's message/open/close/drain handlers",
      context: { routes: wsHub.routes.size },
    });
  }

  const server = Bun.serve({
    ...options,
    routes: prepared.bunRoutes,
    fetch: fetchHandler,
    ...(wsHub !== null ? { websocket: wsHub.bunHandler() } : {}),
  } as Bun.Serve.Options<any>) as Bun.Server<unknown>;
  if (wsHub !== null) wsHub.serverRef.current = server;
  serverRef.current = server;

  const lifecycleHandle: LugasLifecycle = {
    ready: lifecycle.ready,
    shutdown: (reason?: string) => {
      // ADR-0028 shutdown semantics: open sockets never "finish", so the
      // drain contract for WebSockets is close-with-reason (1001 Going Away)
      // before the deadline window; route close handlers run via Bun.
      if (wsHub !== null) wsHub.closeAll(1001, "server shutting down");
      return lifecycle.shutdown(reason);
    },
    // M9-006 (ADR-0032): track(task, request?) correlates detached work
    // with the request's telemetry state — request.end waits for it. The
    // drain still waits for every tracked task either way (ADR-0020).
    track: (task: Promise<unknown>, request?: Request) => {
      if (request !== undefined && prepared.telemetry !== undefined) {
        telemetryTrackTask(prepared.telemetry, prepared.telemetryRegistry, request, task);
      }
      lifecycle.track(task);
    },
  };
  const lugasServer = server as LugasServer;
  Object.defineProperty(lugasServer, "lugasLifecycle", {
    value: Object.freeze(lifecycleHandle),
    enumerable: false,
    writable: false,
  });
  return lugasServer;
}
