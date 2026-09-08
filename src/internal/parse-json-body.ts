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
import {
  createUnsupportedMediaTypeProblem,
  createMalformedJsonProblem,
  createBodyBudgetProblem,
} from "./validation-problem";

export { UNSUPPORTED_MEDIA_TYPE_URI, MALFORMED_JSON_URI } from "./validation-problem";

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

export type ParseJsonBodySuccess = {
  readonly ok: true;
  readonly data: unknown;
};

export type ParseJsonBodyFailure = {
  readonly ok: false;
  readonly response: Response;
  readonly error: "unsupported_media_type" | "malformed_json" | "body_budget_exceeded";
};

/**
 * Bounded consumption (M7-003): counts bytes while reading and stops all
 * further reads the moment the budget is exceeded. A Content-Length header
 * above the budget rejects without reading the stream at all. Abort and
 * transport failures propagate exactly as the unbounded `request.text()`
 * path does.
 */
async function readBodyTextBounded(
  request: Request,
  budget: number,
): Promise<{ ok: true; text: string } | { ok: false }> {
  const contentLength = Number(request.headers.get("content-length") ?? Number.NaN);
  if (Number.isFinite(contentLength) && contentLength > budget) {
    return { ok: false };
  }
  if (request.body === null) return { ok: true, text: "" };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return { ok: true, text };
    received += value!.byteLength;
    if (received > budget) {
      try {
        await reader.cancel();
      } catch {
        // stream already errored/aborted; the failure response below stands
      }
      return { ok: false };
    }
    text += decoder.decode(value, { stream: true });
  }
}

export type ParseJsonBodyResult = ParseJsonBodySuccess | ParseJsonBodyFailure;

export async function parseJsonBody(
  request: Request,
  budget?: number | undefined,
): Promise<ParseJsonBodyResult> {
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
    if (budget !== undefined) {
      const bounded = await readBodyTextBounded(request, budget);
      if (!bounded.ok) {
        return {
          ok: false,
          response: createBodyBudgetProblem(),
          error: "body_budget_exceeded",
        };
      }
      text = bounded.text;
    } else {
      text = await request.text();
    }
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
