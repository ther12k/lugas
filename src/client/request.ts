/**
 * Client request building: headers, JSON body, and RequestInit merging (M3-010).
 *
 * Ownership model (documented precedence):
 * - `method` is owned by the canonical method called; a `method` key inside
 *   platform options is rejected outright.
 * - `body` is owned by the declared structured body; a `body` key inside
 *   platform options is rejected outright.
 * - `headers` are owned by the structured input; platform options may not
 *   carry them, so there is exactly one header channel and no silent
 *   cross-channel contradictions.
 * - A declared body is JSON-serialized; `content-type` defaults to
 *   `application/json` only when the caller did not supply one. A caller
 *   content-type that is not JSON-compatible is a documented conflict and
 *   fails with a stable diagnostic (mirrors M2-007's media-type policy).
 * - `signal`, `credentials`, `redirect`, `cache`, and every other non-owned
 *   platform option are forwarded unchanged.
 * - Absent (`undefined`) or `null` declared bodies send no body at all —
 *   never a synthetic JSON `"undefined"`.
 *
 * Diagnostics name headers but never include header values, so
 * authorization/cookie secrets cannot leak through error messages.
 */

import type { HttpMethod } from "../core/types";

export type ClientRequestErrorCode =
  | "LUGAS_CLIENT_007"
  | "LUGAS_CLIENT_008"
  | "LUGAS_CLIENT_009";

/** Request-building violation; thrown before any network dispatch. */
export class ClientRequestError extends Error {
  readonly code: ClientRequestErrorCode;

  constructor(code: ClientRequestErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "ClientRequestError";
    this.code = code;
  }
}

const OWNED_INIT_KEYS = new Set(["method", "body", "headers"]);

export type BuiltRequest = {
  readonly init: RequestInit;
};

export type BuildRequestOptions = {
  readonly method: HttpMethod;
  /** Structured headers; override platform-option headers per key. */
  readonly headers?: unknown;
  /** Declared JSON body; `undefined`/`null` means no body. */
  readonly body?: unknown;
  /** Platform options minus method/body/headers; forwarded verbatim. */
  readonly init?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function applyHeaderEntries(target: Headers, source: unknown, origin: string): void {
  if (source === undefined || source === null) {
    return;
  }
  if (!isRecord(source)) {
    throw new ClientRequestError("LUGAS_CLIENT_009", `${origin} must be an object`);
  }
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== "string") {
      throw new ClientRequestError(
        "LUGAS_CLIENT_009",
        `${origin} '${key}' must be a string`,
      );
    }
    if (/[\r\n]/.test(value)) {
      throw new ClientRequestError(
        "LUGAS_CLIENT_009",
        `${origin} '${key}' contains forbidden line-break characters`,
      );
    }
    target.set(key, value);
  }
}

export function isJsonCompatibleContentType(value: string): boolean {
  const mediaType = value.split(";")[0]!.trim().toLowerCase();
  return (
    mediaType === "application/json" ||
    mediaType === "application/problem+json" ||
    (mediaType.startsWith("application/") && mediaType.endsWith("+json"))
  );
}

function serializeJsonBody(body: unknown): string {
  try {
    const serialized = JSON.stringify(body);
    if (serialized === undefined) {
      throw new ClientRequestError(
        "LUGAS_CLIENT_008",
        "declared body is not JSON-representable",
      );
    }
    return serialized;
  } catch (error) {
    if (error instanceof ClientRequestError) {
      throw error;
    }
    throw new ClientRequestError(
      "LUGAS_CLIENT_008",
      "declared body is not JSON-serializable",
    );
  }
}

/**
 * Builds the final `RequestInit` for one client dispatch. All ownership,
 * precedence, and serialization rules are enforced here so that no caller
 * input can contradict an owned field silently.
 */
export function buildRequestInit(options: BuildRequestOptions): BuiltRequest {
  let platform: Record<string, unknown> = {};
  if (options.init !== undefined && options.init !== null) {
    if (!isRecord(options.init)) {
      throw new ClientRequestError("LUGAS_CLIENT_007", "platform options must be an object");
    }
    platform = options.init;
  }
  for (const owned of Object.keys(platform)) {
    if (OWNED_INIT_KEYS.has(owned)) {
      throw new ClientRequestError(
        "LUGAS_CLIENT_007",
        `platform options may not own '${owned}'; it is controlled by the typed call`,
      );
    }
  }

  const headers = new Headers();
  applyHeaderEntries(headers, options.headers, "typed header");

  const hasDeclaredBody = options.body !== undefined && options.body !== null;
  let body: string | undefined;
  if (hasDeclaredBody) {
    const callerContentType = headers.get("content-type");
    if (callerContentType !== null && !isJsonCompatibleContentType(callerContentType)) {
      throw new ClientRequestError(
        "LUGAS_CLIENT_008",
        `declared JSON body conflicts with caller content-type '${callerContentType.split(";")[0]!.trim().toLowerCase()}'`,
      );
    }
    if (callerContentType === null) {
      headers.set("content-type", "application/json");
    }
    body = serializeJsonBody(options.body);
  }

  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(platform)) {
    if (!OWNED_INIT_KEYS.has(key)) {
      rest[key] = value;
    }
  }

  const init: RequestInit = {
    ...(rest as RequestInit),
    method: options.method,
    headers,
  };
  if (hasDeclaredBody) {
    init.body = body;
  }
  return { init };
}
