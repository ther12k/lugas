/**
 * Dependency-free telemetry hooks (M9-006, ADR-0032).
 *
 * Two explicit scalar-only callbacks over the existing pipeline:
 * `request.start` (method, path, route, requestId when logging.requestIds
 * is on) and `request.end` (adds status, durationMs, errorClass). The
 * request-end boundary includes work registered through
 * `lugasLifecycle.track(task, request)` — the same set the drain waits on
 * (ADR-0020) — correlated by the request object itself (a contained
 * WeakMap; no globals, no async-context magic). Redaction by construction:
 * headers, bodies, cookies, params, and query never appear in events
 * (ADR-0024 field discipline, extended).
 *
 * Span export is application-owned: docs/telemetry.md ships the
 * toOpenTelemetry() recipe; the framework emits facts only.
 */
import { diagnostic } from "./diagnostics";

export type TelemetryErrorClass = "handler" | "guard" | "framework" | "not-found";

export type TelemetryRequestStart = {
  readonly kind: "request.start";
  readonly method: string;
  readonly path: string;
  readonly route: string;
  readonly requestId: string | undefined;
};

export type TelemetryRequestEnd = {
  readonly kind: "request.end";
  readonly method: string;
  readonly path: string;
  readonly route: string;
  readonly requestId: string | undefined;
  readonly status: number;
  readonly durationMs: number;
  readonly errorClass: TelemetryErrorClass | undefined;
};

export type TelemetryConfig = {
  readonly onRequestStart?: (event: TelemetryRequestStart) => void;
  readonly onRequestEnd?: (event: TelemetryRequestEnd) => void;
};

const TELEMETRY_KEYS = new Set(["onRequestStart", "onRequestEnd"]);

export type CompiledTelemetry = {
  readonly onRequestStart: NonNullable<TelemetryConfig["onRequestStart"]> | undefined;
  readonly onRequestEnd: NonNullable<TelemetryConfig["onRequestEnd"]> | undefined;
};

export function compileTelemetry(config: TelemetryConfig): CompiledTelemetry {
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_TELEMETRY_001", "defineApp(): invalid telemetry configuration", {
      hint: "pass telemetry: { onRequestStart?, onRequestEnd? }",
    });
  }
  for (const key of Object.keys(config)) {
    if (!TELEMETRY_KEYS.has(key)) {
      throw diagnostic("LUGAS_TELEMETRY_001", `defineApp(): unknown telemetry key '${key}'`, {
        hint: "allowed keys: onRequestStart, onRequestEnd",
        context: { key },
      });
    }
  }
  for (const key of ["onRequestStart", "onRequestEnd"] as const) {
    const value = config[key];
    if (value !== undefined && typeof value !== "function") {
      throw diagnostic("LUGAS_TELEMETRY_001", `defineApp(): telemetry.'${key}' must be a function`, {
        hint: "callbacks receive one scalar-only telemetry event",
        context: { key },
      });
    }
  }
  return {
    onRequestStart: config.onRequestStart,
    onRequestEnd: config.onRequestEnd,
  };
}

/**
 * Runtime state for one in-flight request. `request.end` fires exactly once,
 * when the response exists AND the request's tracked work settled — the
 * drain boundary (ADR-0032 §2), so spans include detached work.
 */
export type TelemetryRequestState = {
  readonly started: number;
  readonly method: string;
  readonly path: string;
  readonly route: string;
  readonly requestId: string | undefined;
  response: Response | undefined;
  tracked: number;
  ended: boolean;
};

function errorClassFor(status: number): TelemetryErrorClass | undefined {
  if (status < 400) return undefined;
  if (status === 404) return "not-found";
  if (status === 400 || status === 413 || status === 415 || status === 422) return "framework";
  if (status === 401 || status === 403) return "guard";
  return "handler";
}

function tryFinish(compiled: CompiledTelemetry, state: TelemetryRequestState): void {
  if (state.ended || state.response === undefined || state.tracked > 0) return;
  state.ended = true;
  compiled.onRequestEnd?.({
    kind: "request.end",
    method: state.method,
    path: state.path,
    route: state.route,
    requestId: state.requestId,
    status: state.response.status,
    durationMs: Math.round((performance.now() - state.started) * 100) / 100,
    errorClass: errorClassFor(state.response.status),
  });
}

/**
 * Per-serve correlation registry: the request object is the correlation
 * token applications pass to `lugasLifecycle.track(task, request)`. A
 * WeakMap keeps lifetime bounded by the request; uncorrelated `track()`
 * calls (no second argument) are drain-only, not telemetry-correlated.
 */
export type TelemetryRegistry = WeakMap<Request, TelemetryRequestState>;

export function createTelemetryRegistry(): TelemetryRegistry {
  return new WeakMap();
}

/**
 * Wraps a compiled handler with telemetry events. Outermost of the policy
 * wraps (inside CORS): start fires before anything else observes the
 * request; end fires when the response exists and tracked work settled.
 */
export function wrapTelemetryHandler(
  compiled: CompiledTelemetry,
  registry: TelemetryRegistry,
  route: string,
  makeRequestId: (() => string | undefined) | undefined,
  handler: (request: Request) => Response | Promise<Response>,
): (request: Request) => Response | Promise<Response> {
  if (compiled.onRequestStart === undefined && compiled.onRequestEnd === undefined) return handler;
  return (request: Request): Response | Promise<Response> => {
    const requestId = makeRequestId !== undefined ? makeRequestId() : undefined;
    const state: TelemetryRequestState = {
      started: performance.now(),
      method: request.method,
      path: new URL(request.url).pathname,
      route,
      requestId,
      response: undefined,
      tracked: 0,
      ended: false,
    };
    registry.set(request, state);
    compiled.onRequestStart?.({
      kind: "request.start",
      method: state.method,
      path: state.path,
      route: state.route,
      requestId,
    });
    return Promise.resolve(handler(request)).then((response) => {
      state.response = response instanceof Response ? response : new Response(null, { status: 500 });
      // Stamp the id before the access-log wrapper reads it (one identity
      // source, ADR-0032): logging prefers an existing x-request-id.
      if (requestId !== undefined) {
        try {
          state.response.headers.set("x-request-id", requestId);
        } catch {
          // Immutable-header edge: the events still carry the id.
        }
      }
      tryFinish(compiled, state);
      return response;
    });
  };
}

/**
 * Same events for the serve-time not-found fallback; unmatched requests
 * report `route: "-"` (mirroring the access-log convention).
 */
export function wrapTelemetryFallback(
  compiled: CompiledTelemetry,
  registry: TelemetryRegistry,
  makeRequestId: (() => string | undefined) | undefined,
  fallback: (request: Request, server: Bun.Server<unknown>) => Response | Promise<Response>,
): (request: Request, server: Bun.Server<unknown>) => Response | Promise<Response> {
  if (compiled.onRequestStart === undefined && compiled.onRequestEnd === undefined) return fallback;
  return (request: Request, server: Bun.Server<unknown>): Response | Promise<Response> => {
    const requestId = makeRequestId !== undefined ? makeRequestId() : undefined;
    const state: TelemetryRequestState = {
      started: performance.now(),
      method: request.method,
      path: new URL(request.url).pathname,
      route: "-",
      requestId,
      response: undefined,
      tracked: 0,
      ended: false,
    };
    registry.set(request, state);
    compiled.onRequestStart?.({
      kind: "request.start",
      method: state.method,
      path: state.path,
      route: "-",
      requestId,
    });
    return Promise.resolve(fallback(request, server)).then((response) => {
      state.response = response instanceof Response ? response : new Response(null, { status: 500 });
      if (requestId !== undefined) {
        try {
          state.response.headers.set("x-request-id", requestId);
        } catch {
          // Immutable-header edge: the events still carry the id.
        }
      }
      tryFinish(compiled, state);
      return response;
    });
  };
}

/**
 * Correlates one tracked task with a request's telemetry state. Called from
 * the lifecycle-aware `track()` wrapper in serve.ts; the WeakMap lookup is
 * the entire correlation mechanism.
 */
export function telemetryTrackTask(
  compiled: CompiledTelemetry,
  registry: TelemetryRegistry,
  request: Request,
  task: Promise<unknown>,
): void {
  const state = registry.get(request);
  if (state === undefined || state.ended) return;
  state.tracked += 1;
  void task
    .catch(() => undefined)
    .then(() => {
      state.tracked -= 1;
      tryFinish(compiled, state);
    });
}
