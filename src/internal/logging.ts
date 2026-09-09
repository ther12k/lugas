/**
 * Structured logging contract and opt-in access facility (M8-003, ADR-0024).
 *
 * A sink contract, never a logging product: configuration is compiled once
 * and preparation wraps compiled handlers plus the serve-time fallback so
 * access entries carry honest end-to-end durations. The wrapper sits inside
 * the ADR-0022 CORS wrapper (which stays outermost — preflights are never
 * access-logged) and outside the traffic gate and error policy, so held 503s
 * and error 500s are logged.
 *
 * Redaction by construction: the entry field schema is scalar and closed —
 * framework entries can never carry headers, cookies, authorization values,
 * bodies, query strings, or origin strings.
 */
import { diagnostic } from "./diagnostics";

/** Severity of a framework log entry; `level` gates emission. */
export type LugasLogLevel = "debug" | "info" | "warn" | "error";

/** Scalar-only fields — the redaction guarantee is this type's closure. */
export type LugasLogFields = Record<string, string | number | boolean | null>;

/** One structured log entry, as delivered to the application sink. */
export type LugasLogEntry = {
  /** ISO-8601 timestamp of emission. */
  time: string;
  level: LugasLogLevel;
  message: string;
  fields?: LugasLogFields;
};

/** Adaptation point for vendor loggers (Pino, OpenTelemetry-aware, ...). */
export type LogSink = (entry: LugasLogEntry) => void;

/** Public `defineApp({ logging })` configuration (ADR-0024). */
export type LoggingConfig = {
  /** Minimum severity the framework emits; default `"info"`. */
  level?: LugasLogLevel;
  /** Entry receiver; default writes one JSON line to the matching console method. */
  sink?: LogSink;
  /** Per-request `crypto.randomUUID()`, echoed as `x-request-id` and logged. Default off. */
  requestIds?: boolean;
  /** One info-level access entry per request. Default off (explicit production policy). */
  access?: boolean;
};

/** Validated, normalized logging context consumed by the wrappers. */
export type CompiledLogging = {
  readonly level: LugasLogLevel;
  readonly sink: LogSink;
  readonly requestIds: boolean;
  readonly access: boolean;
};

const LOGGING_KEYS = new Set(["level", "sink", "requestIds", "access"]);
const LEVEL_ORDER: Record<LugasLogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function invalidLogging(message: string, hint: string, context?: Record<string, string | number | boolean | null>): never {
  throw diagnostic("LUGAS_LOG_001", message, { hint, ...(context !== undefined ? { context } : {}) });
}

/** Validates configuration once into a compiled context; preparation and serving never re-read it. */
export function compileLogging(config: LoggingConfig): CompiledLogging {
  if (typeof config !== "object" || config === null) {
    invalidLogging("defineApp(): 'logging' must be an object", "pass logging: { access: true } or remove the key");
  }
  for (const key of Object.keys(config)) {
    if (!LOGGING_KEYS.has(key)) {
      invalidLogging(`defineApp(): unknown logging key '${key}'`, "allowed keys: level, sink, requestIds, access", { key });
    }
  }
  const level = config.level !== undefined ? config.level : "info";
  if (typeof level !== "string" || !(level in LEVEL_ORDER)) {
    invalidLogging("defineApp(): logging.level must be one of \"debug\", \"info\", \"warn\", \"error\"", "example: level: \"warn\"", { level: String(level) });
  }
  if (config.sink !== undefined && typeof config.sink !== "function") {
    invalidLogging("defineApp(): logging.sink must be a function receiving log entries", "example: sink: (entry) => pino[entry.level](entry.fields, entry.message)");
  }
  for (const key of ["requestIds", "access"] as const) {
    const value = config[key];
    if (value !== undefined && typeof value !== "boolean") {
      invalidLogging(`defineApp(): logging.${key} must be a boolean`, `omit for false, or pass ${key}: true`);
    }
  }
  return Object.freeze({
    level,
    sink: config.sink !== undefined ? config.sink : defaultSink,
    requestIds: config.requestIds === true,
    access: config.access === true,
  });
}

function defaultSink(entry: LugasLogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === "warn") console.warn(line);
  else if (entry.level === "error") console.error(line);
  else if (entry.level === "debug") console.debug(line);
  else console.info(line);
}

function emit(logging: CompiledLogging, level: LugasLogLevel, message: string, fields: LugasLogFields): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[logging.level]) return;
  logging.sink({ time: new Date().toISOString(), level, message, fields });
}

/**
 * Outermost-per-request concern after CORS: times the wrapped pipeline
 * (traffic gate and error policy included), attaches `x-request-id` when
 * enabled, and emits the access entry. Never alters response semantics.
 */
export function wrapLogHandler(
  logging: CompiledLogging,
  route: string,
  handler: (request: Request) => Response | Promise<Response>,
): (request: Request) => Response | Promise<Response> {
  if (!logging.access && !logging.requestIds) return handler;
  return (request: Request): Response | Promise<Response> => {
    const started = performance.now();
    const requestId = logging.requestIds ? crypto.randomUUID() : undefined;
    const finish = (status: number): void => {
      if (!logging.access) return;
      emit(logging, "info", "request", {
        method: request.method,
        path: new URL(request.url).pathname,
        route,
        status,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
        ...(requestId !== undefined ? { requestId } : {}),
      });
    };
    return Promise.resolve(handler(request)).then((response) => {
      if (response instanceof Response) {
        if (requestId !== undefined) {
          try {
            response.headers.set("x-request-id", requestId);
          } catch {
            // Immutable-header edge: response identity is preserved; the id
            // still appears in the access entry.
          }
        }
        finish(response.status);
      } else {
        finish(500);
      }
      return response;
    });
  };
}

/** Same contract for the serve-time fetch fallback; unmatched requests log `route: "-"`. */
export function wrapLogFallback(
  logging: CompiledLogging,
  fallback: (request: Request, server: Bun.Server<unknown>) => Response | Promise<Response>,
): (request: Request, server: Bun.Server<unknown>) => Response | Promise<Response> {
  if (!logging.access && !logging.requestIds) return fallback;
  let serverRef: Bun.Server<unknown> | undefined;
  const inner = wrapLogHandler(logging, "-", (request) => fallback(request, serverRef as Bun.Server<unknown>));
  return (request: Request, server: Bun.Server<unknown>): Response | Promise<Response> => {
    serverRef = server;
    return inner(request);
  };
}
