/**
 * Stable diagnostic catalog and formatter (M4-005).
 *
 * One registry for every framework-raised diagnostic. Codes are frozen API
 * (`LUGAS_<FAMILY>_<NNN>`); message wording may evolve. Thrown errors carry
 * optional corrective hints and scalar identity context. Machine formatting
 * never includes stacks or causes; context values are scalar facts (names,
 * keys, methods) — payload/header data is forbidden by convention and by the
 * redaction suites.
 *
 * Client-side codes (`LUGAS_CLIENT_001`–`010`) keep their dedicated classes
 * in `src/client/*` and are cross-referenced in `docs/diagnostics.md`.
 *
 * Data-only diagnostic results (non-throwing, e.g. path analysis) reuse the
 * same code registry through the `LugasDiagnostic` shape.
 */
export type DiagnosticFamily = "APP" | "ASSET" | "MODULE" | "ROUTE" | "GUARD" | "ROUTES" | "RESPONSE" | "TEST";

export type DiagnosticCode =
  | "LUGAS_APP_001" | "LUGAS_APP_002" | "LUGAS_APP_003" | "LUGAS_APP_004" | "LUGAS_APP_005" | "LUGAS_APP_006"
  | "LUGAS_ASSET_001" | "LUGAS_ASSET_002" | "LUGAS_ASSET_003" | "LUGAS_ASSET_004"
  | "LUGAS_MODULE_001" | "LUGAS_MODULE_002" | "LUGAS_MODULE_003" | "LUGAS_MODULE_004" | "LUGAS_MODULE_005"
  | "LUGAS_ROUTE_001" | "LUGAS_ROUTE_002" | "LUGAS_ROUTE_003" | "LUGAS_ROUTE_004" | "LUGAS_ROUTE_005"
  | "LUGAS_GUARD_001" | "LUGAS_GUARD_002" | "LUGAS_GUARD_003" | "LUGAS_GUARD_004"
  | "LUGAS_GUARD_005" | "LUGAS_GUARD_006" | "LUGAS_GUARD_007"
  | "LUGAS_ROUTES_001" | "LUGAS_ROUTES_002" | "LUGAS_ROUTES_003" | "LUGAS_ROUTES_004"
  | "LUGAS_RESPONSE_001" | "LUGAS_RESPONSE_002" | "LUGAS_RESPONSE_003" | "LUGAS_RESPONSE_004" | "LUGAS_RESPONSE_005"
  | "LUGAS_BODY_001" | "LUGAS_BODY_002" | "LUGAS_BODY_003"
  | "LUGAS_CORS_001" | "LUGAS_CORS_002" | "LUGAS_CORS_003" | "LUGAS_CORS_004"
  | "LUGAS_SSE_001" | "LUGAS_SSE_002"
  | "LUGAS_LOG_001"
  | "LUGAS_OPENAPI_001" | "LUGAS_OPENAPI_002"
  | "LUGAS_DRIZZLE_001" | "LUGAS_DRIZZLE_002"
  | "LUGAS_COOKIE_001" | "LUGAS_COOKIE_002"
  | "LUGAS_WS_001" | "LUGAS_WS_002"
  | "LUGAS_HEADERS_001"
  | "LUGAS_HEALTH_001" | "LUGAS_HEALTH_002"
  | "LUGAS_LIFECYCLE_001"
  | "LUGAS_TEST_001"
  | "LUGAS_CLI_001";

/** Data-only diagnostic result (analysis helpers); never thrown as-is. */
export type LugasDiagnostic = {
  code: DiagnosticCode;
  message: string;
};

export type DiagnosticContextValue = string | number | boolean | null;

export type LugasDiagnosticError = Error & {
  readonly code: DiagnosticCode;
  /** Corrective guidance; never contains payload data. */
  readonly hint?: string | undefined;
  /** Scalar identity facts (route, module, method, key). Never payloads. */
  readonly context?: Readonly<Record<string, DiagnosticContextValue>> | undefined;
};

type CatalogEntry = {
  code: DiagnosticCode;
  thrownBy: string;
  meaning: string;
  hint: string;
};

/** The authoritative catalog. Order is documentation order, not semantics. */
export const DIAGNOSTIC_CATALOG: ReadonlyArray<CatalogEntry> = [
  { code: "LUGAS_APP_001", thrownBy: "defineApp()", meaning: "config must be an object", hint: "pass defineApp({ routes }) with an object literal" },
  { code: "LUGAS_APP_002", thrownBy: "defineApp()", meaning: "unknown config key", hint: "allowed keys: services, routes, modules, assets, bodyBudget, cors, notFound, onError" },
  { code: "LUGAS_APP_003", thrownBy: "defineApp()", meaning: "'modules' must be an array", hint: "wrap modules: modules: [defineModule(...)]" },
  { code: "LUGAS_APP_004", thrownBy: "defineApp()", meaning: "modules entry is not a defineModule() descriptor", hint: "create modules with defineModule({ name, routes })" },
  { code: "LUGAS_APP_005", thrownBy: "defineApp()", meaning: "duplicate module name", hint: "module names must be unique within an app" },
  { code: "LUGAS_APP_006", thrownBy: "defineApp()", meaning: "'routes' must be an object keyed by full path", hint: 'use string paths like "/users/:id"' },
  { code: "LUGAS_ASSET_001", thrownBy: "defineApp()", meaning: "invalid asset configuration", hint: "files keys are literal exact paths; dirs keys are explicit prefixes ending in '/*'" },
  { code: "LUGAS_ASSET_002", thrownBy: "defineApp()", meaning: "ambiguous asset/API ownership", hint: "asset declarations and API routes must own disjoint paths; change one of them" },
  { code: "LUGAS_ASSET_003", thrownBy: "defineApp()", meaning: "asset declaration does not point at existing content", hint: "check the filesystem path (relative paths resolve from process working directory)" },
  { code: "LUGAS_ASSET_004", thrownBy: "defineApp()", meaning: "native directory mounts unsupported on this platform", hint: "assets.dirs requires Linux with openat2(RESOLVE_IN_ROOT); use explicit assets.files on other platforms" },
  { code: "LUGAS_BODY_001", thrownBy: "defineApp() / route()", meaning: "invalid body budget configuration", hint: "budget must be a positive integer number of bytes" },
  { code: "LUGAS_BODY_002", thrownBy: "defineApp()", meaning: "body budget requires a declared framework-parsed body", hint: "declare a body schema on the route or remove the budget" },
  { code: "LUGAS_BODY_003", thrownBy: "serve()", meaning: "body budget above the configured server ceiling", hint: "an override relaxes the default, never the ceiling; lower the budget or raise maxRequestBodySize" },
  { code: "LUGAS_CORS_001", thrownBy: "defineApp()", meaning: "invalid cors configuration", hint: "allowed keys: origin, methods, allowedHeaders, exposedHeaders, credentials, maxAge" },
  { code: "LUGAS_CORS_002", thrownBy: "defineApp()", meaning: "invalid cors origin configuration", hint: "origin is a non-empty origin string, an allowlist without \"*\" mixing, \"*\" alone, or a function" },
  { code: "LUGAS_CORS_003", thrownBy: "defineApp()", meaning: "cors credentials incompatible with wildcard origin", hint: "browsers reject credentialed wildcard responses; list concrete origins (or use a callback returning true)" },
  { code: "LUGAS_CORS_004", thrownBy: "defineApp()", meaning: "cors combined with pipeline-bypass route kinds or assets", hint: "convert static values (Response, Bun.file, { dir }) to handlers or serve them from an app without cors" },
  { code: "LUGAS_SSE_001", thrownBy: "sse()", meaning: "invalid sse configuration", hint: "pass sse({ start(writer) { ... } }) with an optional positive heartbeatMs" },
  { code: "LUGAS_SSE_002", thrownBy: "sse() writer", meaning: "invalid SSE event input or non-serializable data", hint: "data is a string, number, boolean, null, or a JSON-serializable object; event/id/comment values are single-line" },
  { code: "LUGAS_LOG_001", thrownBy: "defineApp()", meaning: "invalid logging configuration", hint: "allowed keys: level, sink, requestIds, access; level is debug|info|warn|error" },
  { code: "LUGAS_OPENAPI_001", thrownBy: "defineApp()", meaning: "invalid openapi configuration", hint: "document requires title and version; paths must start with '/'" },
  { code: "LUGAS_OPENAPI_002", thrownBy: "defineApp()", meaning: "openapi endpoint path collision with route or assets", hint: "openapi.path and openapi.ui.path must be disjoint from routes and assets" },
  { code: "LUGAS_DRIZZLE_001", thrownBy: "drizzleService()", meaning: "value is not a recognizable Drizzle instance", hint: "drizzleService({ db }) requires an object with select, insert, update, and delete functions; the adapter never imports drizzle-orm" },
  { code: "LUGAS_DRIZZLE_002", thrownBy: "drizzleService()", meaning: "invalid closeOnDispose option or no closable $client", hint: "closeOnDispose must be a boolean and requires db.$client.close to be a function; compose service() directly for clients that dispose differently" },
  { code: "LUGAS_COOKIE_001", thrownBy: "cookie()", meaning: "invalid cookie name or value token", hint: "names are RFC 6265 tokens; values exclude whitespace, DQUOTE, comma, semicolon, and backslash — encode other characters" },
  { code: "LUGAS_COOKIE_002", thrownBy: "cookie()", meaning: "invalid cookie attributes or attribute combination", hint: 'sameSite "none" requires secure; path/domain are non-empty strings; maxAge is an integer; expires is a valid Date' },
  { code: "LUGAS_WS_001", thrownBy: "websocket()", meaning: "invalid websocket configuration", hint: "allowed keys: before, params, query, headers, message, open, close, drain; message is required" },
  { code: "LUGAS_WS_002", thrownBy: "serve()", meaning: "custom websocket option conflicts with declared websocket() routes", hint: "websocket routes are served by Lugas; remove the serve() websocket option" },
  { code: "LUGAS_HEADERS_001", thrownBy: "defineApp()", meaning: "invalid secureHeaders configuration", hint: "pass secureHeaders: true or { contentSecurityPolicy?: string, hstsMaxAge?: number }; CSP is strictly opt-in" },
  { code: "LUGAS_HEALTH_001", thrownBy: "defineApp()", meaning: "invalid health configuration", hint: "pass health: true or { livenessPath?: string, readinessPath?: string }; paths are concrete and must differ" },
  { code: "LUGAS_HEALTH_002", thrownBy: "defineApp()", meaning: "health endpoint path collision with a route or asset", hint: "rename the health endpoint: health: { livenessPath: '/healthz' }" },
  { code: "LUGAS_LIFECYCLE_001", thrownBy: "service()", meaning: "invalid service lifecycle descriptor", hint: "use service({ name, value, init?, dispose? }) with a non-empty name" },
  { code: "LUGAS_MODULE_001", thrownBy: "defineModule()", meaning: "config must be an object", hint: "pass defineModule({ name, routes })" },
  { code: "LUGAS_MODULE_002", thrownBy: "defineModule()", meaning: "unknown config key", hint: "allowed keys: name, routes" },
  { code: "LUGAS_MODULE_003", thrownBy: "defineModule()", meaning: "'name' must be a non-empty string", hint: "module names appear in manifests; use stable names" },
  { code: "LUGAS_MODULE_004", thrownBy: "defineModule()", meaning: "'routes' must be an object keyed by full path", hint: 'use string paths like "/invoices/:id"' },
  { code: "LUGAS_MODULE_005", thrownBy: "defineModule()", meaning: "duplicate method/path inside one module", hint: "each method+path may be declared once per module" },
  { code: "LUGAS_ROUTE_001", thrownBy: "route()", meaning: "config must be an object", hint: "pass route({ handler })" },
  { code: "LUGAS_ROUTE_002", thrownBy: "route()", meaning: "unknown config key", hint: "allowed keys: handler, before, params, query, headers, body" },
  { code: "LUGAS_ROUTE_003", thrownBy: "route()", meaning: "'handler' must be a function", hint: "handler receives the validated context and returns a Response" },
  { code: "LUGAS_ROUTE_004", thrownBy: "route()", meaning: "'before' must be an array", hint: "list guards in execution order: before: [authGuard]" },
  { code: "LUGAS_ROUTE_005", thrownBy: "route()", meaning: "'before' entries must be guard() descriptors", hint: "create guards with guard({ name, handler })" },
  { code: "LUGAS_GUARD_001", thrownBy: "guard()", meaning: "config must be an object", hint: "pass guard({ name, handler })" },
  { code: "LUGAS_GUARD_002", thrownBy: "guard()", meaning: "unknown config key", hint: "allowed keys: name, handler" },
  { code: "LUGAS_GUARD_003", thrownBy: "guard()", meaning: "'name' must be a non-empty string", hint: "guard names appear in manifests; use stable names" },
  { code: "LUGAS_GUARD_004", thrownBy: "guard()", meaning: "'handler' must be a function", hint: "return a Response to short-circuit or an enrichment object" },
  { code: "LUGAS_GUARD_005", thrownBy: "guard pipeline", meaning: "guard returned an invalid result shape", hint: "return Response to short-circuit, {} for no enrichment, or a plain object of context fields" },
  { code: "LUGAS_GUARD_006", thrownBy: "guard pipeline", meaning: "guard enrichment overwrote a framework-owned context key", hint: "guards may add new context keys but never framework-owned ones" },
  { code: "LUGAS_GUARD_007", thrownBy: "guard pipeline", meaning: "duplicate enrichment key across guards", hint: "each enrichment key may be produced by exactly one guard per route" },
  { code: "LUGAS_ROUTES_001", thrownBy: "compose()", meaning: "duplicate route across owners", hint: "remove one declaration; both owners are named in the message" },
  { code: "LUGAS_ROUTES_002", thrownBy: "defineApp()", meaning: "unsupported route entry under a method key", hint: "use route() descriptors, native Response values, functions, or {dir}" },
  { code: "LUGAS_ROUTES_003", thrownBy: "defineApp()", meaning: "unsupported route entry shape", hint: "same allowed shapes as LUGAS_ROUTES_002" },
  { code: "LUGAS_ROUTES_004", thrownBy: "path analysis", meaning: "invalid route path", hint: "paths must start with '/' and follow Bun route syntax" },
  { code: "LUGAS_RESPONSE_001", thrownBy: "json()", meaning: "content-type override is not a JSON media type", hint: "json() owns application/json and application/*+json; omit the override or use text()" },
  { code: "LUGAS_RESPONSE_002", thrownBy: "text()", meaning: "content-type override is not a text media type", hint: "text() owns text/*; omit the override or use json()" },
  { code: "LUGAS_RESPONSE_003", thrownBy: "problem()", meaning: "content-type override is not application/problem+json", hint: "problem() owns application/problem+json (RFC 9457); omit the override or use json()" },
  { code: "LUGAS_RESPONSE_004", thrownBy: "empty()", meaning: "content-type override on a bodyless response", hint: "empty() owns no body; a response without a body cannot declare a content type" },
  { code: "LUGAS_RESPONSE_005", thrownBy: "json()", meaning: "body serializes to no JSON text", hint: "the body (or its toJSON result) is undefined; use empty() for a bodyless response" },
  { code: "LUGAS_CLI_001", thrownBy: "lugas CLI", meaning: "invalid CLI option value", hint: "--timeout must be a positive integer in milliseconds" },
  { code: "LUGAS_TEST_001", thrownBy: "createTestServer()", meaning: "forbidden server override option", hint: "the test server inherits routes/errors from the app; configure them via defineApp/route/guard" },
];

const CODE_SET = new Set<string>(DIAGNOSTIC_CATALOG.map((entry) => entry.code));

export function diagnosticExists(code: DiagnosticCode): boolean {
  return CODE_SET.has(code);
}

/**
 * Builds a catalog-backed thrown diagnostic. Message wording is free-form;
 * the code and hint are contract.
 */
export function diagnostic(
  code: DiagnosticCode,
  message: string,
  options?: {
    hint?: string | undefined;
    context?: Readonly<Record<string, DiagnosticContextValue>> | undefined;
    cause?: unknown;
  },
): LugasDiagnosticError {
  if (!diagnosticExists(code)) {
    throw new Error(`diagnostic(): unknown code ${JSON.stringify(code)}`);
  }
  const error = new Error(message, { cause: options?.cause }) as LugasDiagnosticError;
  return Object.assign(error, {
    name: "LugasDiagnosticError",
    code,
    ...(options?.hint !== undefined ? { hint: options.hint } : {}),
    ...(options?.context !== undefined ? { context: options.context } : {}),
  });
}

/**
 * Human format: `[CODE] message (k=v, …) — hint`.
 * Machine format: stable JSON with no stack and no cause — golden-safe.
 */
export function formatDiagnostic(
  error: LugasDiagnosticError,
  format: "human" | "json" = "human",
): string {
  if (format === "json") {
    return JSON.stringify({
      code: error.code,
      message: error.message,
      ...(error.hint !== undefined ? { hint: error.hint } : {}),
      ...(error.context !== undefined ? { context: error.context } : {}),
    });
  }
  const ctx = error.context
    ? Object.entries(error.context)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(", ")
    : "";
  const ctxPart = ctx === "" ? "" : ` (${ctx})`;
  const hintPart = error.hint ? ` — ${error.hint}` : "";
  return `[${error.code}] ${error.message}${ctxPart}${hintPart}`;
}

// ---- Catalog-backed helpers for legacy call sites (message-compatible) ----

/** Thrown by compose(): duplicate method/path across owners. */
export function duplicateRoute(
  method: string,
  path: string,
  first: string,
  second: string,
): LugasDiagnosticError {
  return diagnostic(
    "LUGAS_ROUTES_001",
    `duplicate route ${method} ${path}: declared by ${first} and ${second}`,
    { hint: "remove one declaration; both owners are named above", context: { method, path } },
  );
}

/** Data-only result for path analysis (never thrown as-is). */
export function pathInvalid(path: string, reason: string): LugasDiagnostic {
  return {
    code: "LUGAS_ROUTES_004",
    message: `invalid path ${JSON.stringify(path)}: ${reason}`,
  };
}
