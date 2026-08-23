/**
 * `createClient()` base configuration and fetch injection (M3-006).
 *
 * Runtime is platform-neutral: no Bun globals, no Proxy. The application type
 * parameter exists only at compile time and is fully erased — the client stores
 * just the normalized base URL and the transport function. Base URL
 * normalization preserves origin and base path; a base URL carrying a query or
 * fragment is rejected instead of silently dropping those parts.
 */

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

/**
 * The typed Lugas client handle. `API` names the application contract for
 * compile-time method typing (introduced incrementally from M3-007 on); it is
 * never represented at runtime.
 */
export type LugasClient<API = unknown> = {
  /** Resolved base URL parts (frozen snapshot of configuration). */
  readonly baseUrl: NormalizedBaseUrl;
  /** The transport used for requests (injected or global). */
  readonly fetch: ClientFetch;
  /** Phantom marker keeping `API` nominally attached without runtime presence. */
  readonly _api?: API;
};

/**
 * Creates a typed client bound to a base URL and transport.
 * The `API` type parameter is accepted for end-to-end typing and erased.
 */
export function createClient<API = unknown>(config: ClientConfig): LugasClient<API> {
  if (typeof config !== "object" || config === null) {
    throw new Error(`${DIAGNOSTIC_PREFIX} config must be an object`);
  }
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const transport: ClientFetch =
    config.fetch ?? (globalThis.fetch.bind(globalThis) as ClientFetch);
  return Object.freeze({
    baseUrl,
    fetch: transport,
  });
}
