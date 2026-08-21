/**
 * JSON media-type parsing and malformed body policy (M2-007).
 *
 * Enforces JSON-compatible Content-Type headers, reads the request body once,
 * and parses JSON payloads with strict error classification:
 * - 415 Problem Details for unsupported / missing media types
 * - 400 Problem Details for malformed JSON syntax with redacted details
 * - Empty body returns `data: undefined` letting schemas decide validity
 * - Request cancellation / abort signals are preserved
 */
import { problem } from "../core/response";

export const UNSUPPORTED_MEDIA_TYPE_URI = "https://lugasjs.dev/problems/unsupported-media-type";
export const MALFORMED_JSON_URI = "https://lugasjs.dev/problems/malformed-json";

export function isJsonMediaType(contentType: string | null | undefined): boolean {
  if (typeof contentType !== "string" || contentType.trim() === "") return false;
  const mediaType = contentType.split(";")[0]!.trim().toLowerCase();
  if (mediaType === "application/json" || mediaType === "application/problem+json") {
    return true;
  }
  if (mediaType.startsWith("application/") && mediaType.endsWith("+json")) {
    return true;
  }
  return false;
}

export function createUnsupportedMediaTypeProblem(): Response {
  return problem(415, {
    type: UNSUPPORTED_MEDIA_TYPE_URI,
    title: "Unsupported Media Type",
    code: "UNSUPPORTED_MEDIA_TYPE",
    detail: "Expected a JSON-compatible Content-Type header (e.g. application/json)",
  });
}

export function createMalformedJsonProblem(): Response {
  return problem(400, {
    type: MALFORMED_JSON_URI,
    title: "Malformed JSON",
    code: "MALFORMED_JSON",
    detail: "Request body could not be parsed as valid JSON",
  });
}

export type ParseJsonBodySuccess = {
  readonly ok: true;
  readonly data: unknown;
};

export type ParseJsonBodyFailure = {
  readonly ok: false;
  readonly response: Response;
  readonly error: "unsupported_media_type" | "malformed_json";
};

export type ParseJsonBodyResult = ParseJsonBodySuccess | ParseJsonBodyFailure;

export async function parseJsonBody(request: Request): Promise<ParseJsonBodyResult> {
  if (request.signal?.aborted) {
    throw (request.signal as { readonly reason?: unknown }).reason ?? new DOMException("The operation was aborted.", "AbortError");
  }

  const contentType = request.headers.get("content-type");
  if (!isJsonMediaType(contentType)) {
    return {
      ok: false,
      response: createUnsupportedMediaTypeProblem(),
      error: "unsupported_media_type",
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch (error) {
    if (request.signal?.aborted) {
      throw error;
    }
    return {
      ok: false,
      response: createMalformedJsonProblem(),
      error: "malformed_json",
    };
  }

  if (request.signal?.aborted) {
    throw (request.signal as { readonly reason?: unknown }).reason ?? new DOMException("The operation was aborted.", "AbortError");
  }

  if (text.trim() === "") {
    return {
      ok: true,
      data: undefined,
    };
  }

  try {
    const parsed = JSON.parse(text);
    return {
      ok: true,
      data: parsed,
    };
  } catch {
    return {
      ok: false,
      response: createMalformedJsonProblem(),
      error: "malformed_json",
    };
  }
}
