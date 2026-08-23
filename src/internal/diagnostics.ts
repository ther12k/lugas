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
export type DiagnosticFamily = "APP" | "MODULE" | "ROUTE" | "GUARD" | "ROUTES";

export type DiagnosticCode =
  | "LUGAS_APP_001" | "LUGAS_APP_002" | "LUGAS_APP_003" | "LUGAS_APP_004" | "LUGAS_APP_005" | "LUGAS_APP_006"
  | "LUGAS_MODULE_001" | "LUGAS_MODULE_002" | "LUGAS_MODULE_003" | "LUGAS_MODULE_004" | "LUGAS_MODULE_005"
  | "LUGAS_ROUTE_001" | "LUGAS_ROUTE_002" | "LUGAS_ROUTE_003" | "LUGAS_ROUTE_004" | "LUGAS_ROUTE_005"
  | "LUGAS_GUARD_001" | "LUGAS_GUARD_002" | "LUGAS_GUARD_003" | "LUGAS_GUARD_004"
  | "LUGAS_ROUTES_001" | "LUGAS_ROUTES_002" | "LUGAS_ROUTES_003" | "LUGAS_ROUTES_004";

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
  { code: "LUGAS_APP_002", thrownBy: "defineApp()", meaning: "unknown config key", hint: "allowed keys: services, routes, modules, notFound, onError" },
  { code: "LUGAS_APP_003", thrownBy: "defineApp()", meaning: "'modules' must be an array", hint: "wrap modules: modules: [defineModule(...)]" },
  { code: "LUGAS_APP_004", thrownBy: "defineApp()", meaning: "modules entry is not a defineModule() descriptor", hint: "create modules with defineModule({ name, routes })" },
  { code: "LUGAS_APP_005", thrownBy: "defineApp()", meaning: "duplicate module name", hint: "module names must be unique within an app" },
  { code: "LUGAS_APP_006", thrownBy: "defineApp()", meaning: "'routes' must be an object keyed by full path", hint: 'use string paths like "/users/:id"' },
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
  { code: "LUGAS_ROUTES_001", thrownBy: "compose()", meaning: "duplicate route across owners", hint: "remove one declaration; both owners are named in the message" },
  { code: "LUGAS_ROUTES_002", thrownBy: "serve pipeline", meaning: "unsupported route entry under a method key", hint: "use route() descriptors, native Response values, functions, or {dir}" },
  { code: "LUGAS_ROUTES_003", thrownBy: "serve pipeline", meaning: "unsupported route entry shape", hint: "same allowed shapes as LUGAS_ROUTES_002" },
  { code: "LUGAS_ROUTES_004", thrownBy: "path analysis", meaning: "invalid route path", hint: "paths must start with '/' and follow Bun route syntax" },
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
