/**
 * `createClient()` base configuration, fetch injection, explicit typed HTTP
 * methods, and path-parameter interpolation (M3-006–M3-008).
 *
 * Runtime is platform-neutral: no Bun globals, no Proxy. The application type
 * parameter exists only at compile time and is fully erased — the client stores
 * just the normalized base URL, the transport function, and a small enumerable
 * set of method functions. Base URL normalization preserves origin and base
 * path; a base URL carrying a query or fragment is rejected instead of silently
 * dropping those parts.
 */
import type { HttpMethod } from "../core/types";
import type { ClientMethod, ClientRequestEscapeHatch } from "./types";
import { interpolatePath } from "./path";
import { appendQuery, serializeQuery } from "./query";
import { buildRequestInit } from "./request";
import type { ClientResult } from "./parse-response";
import { parseResponse } from "./parse-response";

export type ClientFetch = typeof fetch;

export type ClientConfig = {
  /** Origin (+ optional base path). Trailing slashes are normalized. */
  readonly baseUrl: string | URL;
  /**
   * Transport override. Receives `(input, init)` exactly like the Fetch API.
   * Defaults to the global `fetch`, captured when the client is created.
   */
  readonly fetch?: ClientFetch | undefined;
};

export type NormalizedBaseUrl = {
  readonly origin: string;
  readonly basePath: string;
};

const DIAGNOSTIC_PREFIX = "createClient():";

/** Parses and validates the base URL, failing early with a client diagnostic. */
export function normalizeBaseUrl(baseUrl: string | URL): NormalizedBaseUrl {
  let parsed: URL;
  try {
    parsed = baseUrl instanceof URL ? baseUrl : new URL(baseUrl);
  } catch {
    throw new Error(`${DIAGNOSTIC_PREFIX} invalid baseUrl ${JSON.stringify(String(baseUrl))}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${DIAGNOSTIC_PREFIX} baseUrl must use http(s), got '${parsed.protocol}'`);
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    throw new Error(
      `${DIAGNOSTIC_PREFIX} baseUrl must not include a query or hash; pass query parameters per request`,
    );
  }
  const basePath = parsed.pathname.replace(/\/+$/, "");
  return { origin: parsed.origin, basePath };
}

/** Joins the normalized base with a request path, preserving both. */
export function joinUrl(base: NormalizedBaseUrl, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base.origin}${base.basePath}${normalizedPath}`;
}

/** The supported uppercase HTTP verbs, matching Bun's native route method set. */
export const CLIENT_HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const satisfies readonly HttpMethod[];

/**
 * The typed Lugas client handle. `API` names the application contract for
 * compile-time method typing; it is never represented at runtime.
 */
export type LugasClient<API = unknown> = {
  /** Resolved base URL parts (frozen snapshot of configuration). */
  readonly baseUrl: NormalizedBaseUrl;
  /** The transport used for requests (injected or global). */
  readonly fetch: ClientFetch;
  readonly get: ClientMethod<API, "GET">;
  readonly post: ClientMethod<API, "POST">;
  readonly put: ClientMethod<API, "PUT">;
  readonly patch: ClientMethod<API, "PATCH">;
  readonly delete: ClientMethod<API, "DELETE">;
  readonly head: ClientMethod<API, "HEAD">;
  readonly options: ClientMethod<API, "OPTIONS">;
  /** Generic escape hatch; see `ClientRequestEscapeHatch`. */
  readonly request: ClientRequestEscapeHatch;
};

/**
 * Reads one structured-input slot at the runtime boundary. Compile-time
 * safety is provided by the `MethodCallInput` signature; this helper exists
 * because generic deferred types cannot be property-accessed directly here.
 */
function slot<K extends string>(input: unknown, key: K): unknown {
  if (typeof input !== "object" || input === null) {
    return undefined;
  }
  return (input as Record<string, unknown>)[key];
}

/**
 * Creates a typed client bound to a base URL and transport.
 * The `API` type parameter is accepted for end-to-end typing and erased:
 * methods are plain functions built here, so no Proxy or runtime route tree
 * is involved in dispatching.
 */
export function createClient<API = unknown>(config: ClientConfig): LugasClient<API> {
  if (typeof config !== "object" || config === null) {
    throw new Error(`${DIAGNOSTIC_PREFIX} config must be an object`);
  }
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const transport: ClientFetch =
    config.fetch ?? (globalThis.fetch.bind(globalThis) as ClientFetch);
  const send = <TResult>(method: HttpMethod, path: string, input?: unknown): Promise<TResult> => {
    const target = appendQuery(
      joinUrl(baseUrl, interpolatePath(path, slot(input, "params"))),
      serializeQuery(slot(input, "query")),
    );
    const built = buildRequestInit({
      method,
      headers: slot(input, "headers"),
      body: slot(input, "body"),
      init: slot(input, "init"),
    });
    const parse = async () => {
      const response: Response = await transport(target, built.init);
      return parseResponse(response);
    };
    return parse() as Promise<TResult>;
  };
  return Object.freeze({
    baseUrl,
    fetch: transport,
    get: (path, input) => send("GET", path, input),
    post: (path, input) => send("POST", path, input),
    put: (path, input) => send("PUT", path, input),
    patch: (path, input) => send("PATCH", path, input),
    delete: (path, input) => send("DELETE", path, input),
    head: (path, input) => send("HEAD", path, input),
    options: (path, input) => send("OPTIONS", path, input),
    request: (method, path) => {
      if (!(CLIENT_HTTP_METHODS as readonly string[]).includes(method)) {
        throw new Error(
          `${DIAGNOSTIC_PREFIX} unsupported request method ${JSON.stringify(String(method))}; expected one of ${CLIENT_HTTP_METHODS.join(", ")}`,
        );
      }
      return transport(joinUrl(baseUrl, path), { method });
    },
  });
}
