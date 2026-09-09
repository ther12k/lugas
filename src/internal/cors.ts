/**
 * First-party CORS policy (M8-001, ADR-0022).
 *
 * App-level, opt-in, enforced at the compile boundary: `defineApp({ cors })`
 * validates configuration once into this compiled policy, and preparation
 * wraps every compiled handler function — plus the serve-time fetch fallback
 * — with the policy applied as the outermost layer. Bun's native router
 * stays authoritative: no routes are synthesized and no path matching is
 * reimplemented; preflights that match no declared OPTIONS/any-method entry
 * reach the fallback wrapper through Bun's own routing.
 *
 * Fail-closed posture: every response from a CORS-configured app carries
 * `Vary: Origin` (merged, never duplicated); denied or absent origins get
 * no `Access-Control-*` headers; wildcard `"*"` is incompatible with
 * credentials (startup rejection for static configuration, runtime deny for
 * wildcard callback results).
 */
import { diagnostic } from "./diagnostics";

/** Result of an origin decision: the origin string to echo, or null for deny. */
export type CorsOriginDecision = boolean | string;

/** `cors.origin`: exact origin, allowlist, wildcard `"*"`, or a callback. */
export type CorsOriginInput =
  | string
  | ReadonlyArray<string>
  | ((origin: string, request: Request) => CorsOriginDecision | Promise<CorsOriginDecision>);

/** Public `defineApp({ cors })` configuration (ADR-0022). */
export type CorsConfig = {
  /** Required. Exact origin string, allowlist array, `"*"`, or callback. */
  origin: CorsOriginInput;
  /** Preflight method gate; defaults to the supported method set minus OPTIONS. */
  methods?: ReadonlyArray<string>;
  /** Allowed request headers; defaults to reflecting `Access-Control-Request-Headers`. */
  allowedHeaders?: ReadonlyArray<string>;
  /** Headers exposed to cross-origin reads on actual responses. */
  exposedHeaders?: ReadonlyArray<string>;
  /** Emit `Access-Control-Allow-Credentials: true`; incompatible with `"*"`. */
  credentials?: boolean;
  /** `Access-Control-Max-Age` in seconds. */
  maxAge?: number;
};

/** Validated, normalized policy consumed by the wrappers. */
export type CompiledCorsPolicy = {
  readonly wildcard: boolean;
  readonly originSet: ReadonlySet<string> | null;
  readonly originCallback: ((origin: string, request: Request) => CorsOriginDecision | Promise<CorsOriginDecision>) | null;
  readonly methods: ReadonlySet<string>;
  readonly methodsHeader: string;
  readonly allowedHeaders: ReadonlyArray<string> | null;
  readonly allowedHeaderSet: ReadonlySet<string> | null;
  readonly exposedHeader: string | null;
  readonly credentials: boolean;
  readonly maxAge: number | null;
};

const CORS_KEYS = new Set(["origin", "methods", "allowedHeaders", "exposedHeaders", "credentials", "maxAge"]);
const SUPPORTED_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const DEFAULT_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"] as const;
const HEADER_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function invalid(code: "LUGAS_CORS_001" | "LUGAS_CORS_002" | "LUGAS_CORS_003", message: string, hint: string, context?: Record<string, string | number | boolean | null>): never {
  throw diagnostic(code, message, { hint, ...(context !== undefined ? { context } : {}) });
}

/** Validates configuration once and normalizes it into a compiled policy. */
export function compileCorsPolicy(config: CorsConfig): CompiledCorsPolicy {
  if (typeof config !== "object" || config === null) {
    invalid("LUGAS_CORS_001", "defineApp(): 'cors' must be an object", "pass cors: { origin, ... } with an object literal");
  }
  for (const key of Object.keys(config)) {
    if (!CORS_KEYS.has(key)) {
      invalid("LUGAS_CORS_001", `defineApp(): unknown cors key '${key}'`, "allowed keys: origin, methods, allowedHeaders, exposedHeaders, credentials, maxAge", { key });
    }
  }

  // Origin: exact string, allowlist array, or callback. "*" may stand only
  // alone; credentials never combine with it (static case rejected here,
  // callback case denied at evaluation).
  let wildcard = false;
  let originSet: Set<string> | null = null;
  let originCallback: CompiledCorsPolicy["originCallback"] = null;
  const origin = config.origin;
  if (typeof origin === "string") {
    if (origin === "") invalid("LUGAS_CORS_002", "defineApp(): cors.origin must be a non-empty origin string, \"*\", an array of origins, or a function", "example: \"https://app.example.com\"");
    if (origin === "*") wildcard = true;
    else originSet = new Set([origin]);
  } else if (Array.isArray(origin)) {
    if (origin.length === 0) {
      invalid("LUGAS_CORS_002", "defineApp(): cors.origin array must not be empty", "list concrete origins, or use \"*\" alone for wildcard");
    }
    for (const entry of origin) {
      if (typeof entry !== "string" || entry === "") {
        invalid("LUGAS_CORS_002", "defineApp(): cors.origin array entries must be non-empty strings", "example: [\"https://a.example.com\", \"https://b.example.com\"]");
      }
      if (entry === "*" && origin.length > 1) {
        invalid("LUGAS_CORS_002", "defineApp(): cors.origin wildcard \"*\" cannot be combined with concrete origins", "use \"*\" alone, or list concrete origins");
      }
    }
    if (origin.length === 1 && origin[0] === "*") wildcard = true;
    else originSet = new Set(origin as ReadonlyArray<string>);
  } else if (typeof origin === "function") {
    originCallback = origin;
  } else {
    invalid("LUGAS_CORS_002", "defineApp(): cors.origin must be a string, an array of strings, or a function", "example: \"https://app.example.com\" or (origin, request) => origin.endsWith(\".example.com\")");
  }

  const credentials = config.credentials !== undefined ? config.credentials : false;
  if (typeof credentials !== "boolean") {
    invalid("LUGAS_CORS_001", "defineApp(): cors.credentials must be a boolean", "omit for false, or pass credentials: true to allow credentialed requests");
  }
  if (credentials && wildcard) {
    invalid("LUGAS_CORS_003", "defineApp(): cors.credentials is incompatible with wildcard origin \"*\"", "browsers reject credentialed wildcard responses; list concrete origins (or use a callback returning true)");
  }

  const methods = config.methods !== undefined ? config.methods : DEFAULT_METHODS;
  if (!Array.isArray(methods) || methods.length === 0) {
    invalid("LUGAS_CORS_001", "defineApp(): cors.methods must be a non-empty array of uppercase HTTP methods", `example: ["GET", "POST"]; supported: ${[...SUPPORTED_METHODS].join(", ")}`);
  }
  const methodSet = new Set<string>();
  for (const method of methods) {
    if (typeof method !== "string" || !SUPPORTED_METHODS.has(method)) {
      invalid("LUGAS_CORS_001", `defineApp(): cors.methods entry '${String(method)}' is not a supported uppercase HTTP method`, `supported: ${[...SUPPORTED_METHODS].join(", ")}`);
    }
    if (methodSet.has(method)) {
      invalid("LUGAS_CORS_001", `defineApp(): cors.methods contains duplicate '${method}'`, "list each method once");
    }
    methodSet.add(method);
  }

  const validateHeaderList = (key: "allowedHeaders" | "exposedHeaders"): ReadonlyArray<string> => {
    const list = config[key];
    if (!Array.isArray(list) || list.length === 0) {
      invalid("LUGAS_CORS_001", `defineApp(): cors.${key} must be a non-empty array of header names`, 'example: ["Content-Type", "X-Request-Id"]');
    }
    const seen = new Set<string>();
    for (const name of list) {
      if (typeof name !== "string" || !HEADER_TOKEN.test(name)) {
        invalid("LUGAS_CORS_001", `defineApp(): cors.${key} entry '${String(name)}' is not a valid header name`, "use concrete header names; wildcards are not accepted");
      }
      if (seen.has(name.toLowerCase())) {
        invalid("LUGAS_CORS_001", `defineApp(): cors.${key} contains duplicate '${name}' (case-insensitive)`, "list each header once");
      }
      seen.add(name.toLowerCase());
    }
    return list as ReadonlyArray<string>;
  };
  const allowedHeaders = config.allowedHeaders !== undefined ? validateHeaderList("allowedHeaders") : null;
  const exposedHeaders = config.exposedHeaders !== undefined ? validateHeaderList("exposedHeaders") : null;

  const maxAge = config.maxAge;
  if (maxAge !== undefined && (typeof maxAge !== "number" || !Number.isInteger(maxAge) || maxAge < 0)) {
    invalid("LUGAS_CORS_001", "defineApp(): cors.maxAge must be a non-negative integer number of seconds", "example: maxAge: 600");
  }

  return Object.freeze({
    wildcard,
    originSet,
    originCallback,
    methods: methodSet,
    methodsHeader: [...methodSet].join(", "),
    allowedHeaders,
    allowedHeaderSet: allowedHeaders !== null ? new Set(allowedHeaders.map((h) => h.toLowerCase())) : null,
    exposedHeader: exposedHeaders !== null ? exposedHeaders.join(", ") : null,
    credentials,
    maxAge: maxAge ?? null,
  });
}

/** Resolves the origin decision for one request: origin string to echo, or null (deny / no origin). */
async function evaluateOrigin(policy: CompiledCorsPolicy, request: Request): Promise<string | null> {
  const origin = request.headers.get("origin");
  if (origin === null) return null;
  if (policy.wildcard) return "*";
  if (policy.originSet !== null) return policy.originSet.has(origin) ? origin : null;
  if (policy.originCallback !== null) {
    const decision = await policy.originCallback(origin, request);
    if (decision === true) return origin;
    if (decision === false || decision === undefined || decision === null) return null;
    if (typeof decision === "string") {
      // Fail closed: a wildcard result under credentials would be rejected
      // by browsers; deny instead of emitting an unusable authorization.
      if (decision === "" || (policy.credentials && decision === "*")) return null;
      return decision;
    }
    return null;
  }
  return null;
}

function appendVary(headers: Headers, name: string): void {
  const existing = headers.get("vary");
  if (existing === null) {
    headers.append("Vary", name);
    return;
  }
  const listed = existing.split(",").map((part) => part.trim().toLowerCase());
  if (!listed.includes(name.toLowerCase())) headers.append("Vary", name);
}

/**
 * Applies header mutations to a response. Headers are mutated in place when
 * mutations are observable; when they are silently dropped (the fetch spec's
 * immutable guard — absent in Bun 1.4 but not guaranteed to stay so), the
 * response is reconstructed with the merged header set, falling back to the
 * untouched response if reconstruction itself is impossible.
 */
function withAppliedHeaders(response: Response, apply: (headers: Headers) => void): Response {
  const probe = "x-lugas-header-probe";
  response.headers.append(probe, "1");
  if (response.headers.get(probe) === "1") {
    response.headers.delete(probe);
    apply(response.headers);
    return response;
  }
  try {
    const headers = new Headers(response.headers);
    apply(headers);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch {
    return response;
  }
}

/** Adds `Vary: Origin` plus (for allowed origins) the actual-response CORS headers. */
async function applyResponseHeaders(policy: CompiledCorsPolicy, request: Request, response: Response): Promise<Response> {
  const echo = await evaluateOrigin(policy, request);
  return withAppliedHeaders(response, (headers) => {
    appendVary(headers, "Origin");
    if (echo !== null) {
      headers.set("Access-Control-Allow-Origin", echo);
      if (policy.credentials) headers.set("Access-Control-Allow-Credentials", "true");
      if (policy.exposedHeader !== null) headers.set("Access-Control-Expose-Headers", policy.exposedHeader);
    }
  });
}

function isPreflight(request: Request): boolean {
  return request.method === "OPTIONS" && request.headers.has("access-control-request-method");
}

/**
 * Answers a preflight: 204 with the full header set when origin, method, and
 * requested headers are all allowed; 204 with only `Vary` otherwise, so the
 * browser fails the preflight instead of receiving a partial authorization.
 */
async function preflightResponse(policy: CompiledCorsPolicy, request: Request): Promise<Response> {
  const headers = new Headers({ Vary: "Origin, Access-Control-Request-Method, Access-Control-Request-Headers" });
  const echo = await evaluateOrigin(policy, request);
  const requestedMethod = request.headers.get("access-control-request-method");
  if (echo !== null && requestedMethod !== null && policy.methods.has(requestedMethod)) {
    let allowedHeadersValue: string | null = null;
    const requestedHeaders = request.headers.get("access-control-request-headers");
    if (policy.allowedHeaders === null) {
      allowedHeadersValue = requestedHeaders; // reflection (bounded by the allowed origin)
    } else if (requestedHeaders !== null) {
      const requested = requestedHeaders.split(",").map((h) => h.trim().toLowerCase()).filter((h) => h !== "");
      const everyAllowed = requested.every((h) => policy.allowedHeaderSet!.has(h));
      allowedHeadersValue = everyAllowed ? policy.allowedHeaders.join(", ") : null;
    } else {
      allowedHeadersValue = policy.allowedHeaders.join(", ");
    }
    if (allowedHeadersValue !== null || policy.allowedHeaders === null) {
      headers.set("Access-Control-Allow-Origin", echo);
      if (policy.credentials) headers.set("Access-Control-Allow-Credentials", "true");
      headers.set("Access-Control-Allow-Methods", policy.methodsHeader);
      if (allowedHeadersValue !== null) headers.set("Access-Control-Allow-Headers", allowedHeadersValue);
      if (policy.maxAge !== null) headers.set("Access-Control-Max-Age", String(policy.maxAge));
    }
  }
  return new Response(null, { status: 204, headers });
}

/**
 * Outermost wrapper for compiled route handlers (path-level and per-method,
 * Lugas descriptors and native functions alike). Preflights are intercepted
 * before the handler; every other response passes through with the policy
 * headers applied. A synchronous handler throw propagates unchanged (raw
 * native semantics are not absorbed by CORS).
 */
export function corsWrapHandler(
  policy: CompiledCorsPolicy,
  handler: (request: Request) => Response | Promise<Response>,
): (request: Request) => Promise<Response> {
  return (request: Request): Promise<Response> => {
    if (isPreflight(request)) return preflightResponse(policy, request);
    return Promise.resolve(handler(request)).then((response) => applyResponseHeaders(policy, request, response));
  };
}

/**
 * Wrapper for the serve-time fetch fallback (user `fetch` or the not-found
 * policy). Preflights that Bun routed here — undeclared paths, or declared
 * paths without an OPTIONS entry — are answered with the preflight response;
 * everything else keeps fallback semantics with policy headers applied.
 */
export function corsWrapFallback(
  policy: CompiledCorsPolicy,
  fallback: (request: Request, server: Bun.Server<unknown>) => Response | Promise<Response>,
): (request: Request, server: Bun.Server<unknown>) => Promise<Response> {
  return (request: Request, server: Bun.Server<unknown>): Promise<Response> => {
    if (isPreflight(request)) return preflightResponse(policy, request);
    return Promise.resolve(fallback(request, server)).then((response) => applyResponseHeaders(policy, request, response));
  };
}
