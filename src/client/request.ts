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
 * - A declared JSON body is JSON-serialized; `content-type` defaults to
 *   `application/json` only when the caller did not supply one. A caller
 *   content-type that is not JSON-compatible is a documented conflict and
 *   fails with a stable diagnostic (mirrors M2-007's media-type policy).
 * - A declared multipart body (`formBody()` wrapper — the runtime encoder
 *   discriminator, RF-3 roadmap item 3) is converted to native `FormData`:
 *   native `File`/`Blob` values are preserved as parts, flat arrays send one
 *   part per element under the same field name, and `content-type` is NEVER
 *   set by the client — the platform generates the multipart boundary. A
 *   caller content type is a conflict (`LUGAS_CLIENT_008`).
 * - `signal`, `credentials`, `redirect`, `cache`, and every other non-owned
 *   platform option are forwarded unchanged.
 * - Body presence is distinct from body value (M4R1-006): an omitted key or
 *   `undefined` sends no body at all — never a synthetic JSON `"undefined"` —
 *   while an explicit `null` serializes as literal JSON `null`.
 * - Diagnostics name headers but never include header values, so
 *   authorization/cookie secrets cannot leak through error messages.
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
  /** Declared JSON body; `undefined` (or omitted) means no body, `null` is JSON null. */
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
 * Runtime discriminator for the multipart encoder (the compile-time contract
 * is erased before dispatch): the `formBody()` wrapper shape. A declared JSON
 * body never carries `multipart: true` plus a `values` object; a payload that
 * deliberately fakes the shape on a JSON route fails loudly server-side with
 * the typed 415 branch instead of silently succeeding.
 */
function isMultipartBodyValue(body: unknown): body is { readonly multipart: true; readonly values: Record<string, unknown> } {
  return (
    typeof body === "object" && body !== null &&
    (body as { multipart?: unknown }).multipart === true &&
    typeof (body as { values?: unknown }).values === "object" &&
    (body as { values?: unknown }).values !== null
  );
}

function appendMultipartPart(formData: FormData, key: string, value: unknown): void {
  if (typeof value === "string") {
    formData.append(key, value);
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    formData.append(key, String(value));
    return;
  }
  if (value instanceof Blob) {
    // Native File/Blob values are preserved as parts (File keeps its name).
    formData.append(key, value);
    return;
  }
  throw new ClientRequestError(
    "LUGAS_CLIENT_008",
    `multipart field '${key}' must be a string, number, boolean, Blob, or a flat array of those`,
  );
}

function toMultipartFormData(values: Record<string, unknown>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      // Fan out one level: one part per element under the same field name.
      // Elements must be scalar/Blob — nested arrays are rejected, never flattened.
      for (const element of value) {
        if (Array.isArray(element)) {
          throw new ClientRequestError("LUGAS_CLIENT_008", `multipart field '${key}' must be a flat array (no nested arrays)`);
        }
        appendMultipartPart(formData, key, element);
      }
      continue;
    }
    appendMultipartPart(formData, key, value);
  }
  return formData;
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

  const hasDeclaredBody = options.body !== undefined;
  let body: string | FormData | undefined;
  if (hasDeclaredBody && isMultipartBodyValue(options.body)) {
    // Multipart path: the platform generates the boundary, so ANY caller
    // content type is a conflict — there is no compatible one to set.
    const callerContentType = headers.get("content-type");
    if (callerContentType !== null) {
      throw new ClientRequestError(
        "LUGAS_CLIENT_008",
        `declared multipart body conflicts with caller content-type '${callerContentType.split(";")[0]!.trim().toLowerCase()}'; the platform generates the multipart boundary`,
      );
    }
    body = toMultipartFormData(options.body.values);
  } else if (hasDeclaredBody) {
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
  // Presence guard on the value (not the flag): under DOM-lib consumers
  // `undefined` is not assignable to `body?: BodyInit | null` with
  // exactOptionalPropertyTypes, and the two are equivalent here — body is
  // undefined exactly when no body was declared.
  if (body !== undefined) {
    init.body = body;
  }
  return { init };
}
