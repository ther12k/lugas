/**
 * Client response parsing into discriminated results (M3-011).
 *
 * The runtime branch follows the ACTUAL response (`Response.ok` and its real
 * status), never compile-time expectations: a route declared to return 200
 * that responds 500 yields an `ok: false` failure keyed by 500.
 *
 * Media-type helpers parse recognized bodies and leave everything else
 * untouched:
 * - `application/json` and every `application/*+json` (incl. Problem
 *   Details) parse as JSON;
 * - `text/*` parses as text;
 * - absent content types (and bodiless statuses like 204/205/304) yield
 *   `undefined`;
 * - unknown media types are not consumed at all.
 *
 * Bodies are always read from a `Response.clone()` so the returned
 * `response` keeps a readable, header-complete body after parsing.
 *
 * Decode-failure semantics (throw vs result for malformed declared JSON)
 * are frozen by M3-012; the interim policy records them as `undefined`
 * payload with the original response attached.
 */

export type ClientSuccess<TStatus extends number, TData> = {
  readonly ok: true;
  readonly status: TStatus;
  readonly data: TData;
  readonly response: Response;
};

export type ClientFailure<TStatus extends number, TError> = {
  readonly ok: false;
  readonly status: TStatus;
  readonly error: TError;
  readonly response: Response;
};

/** Discriminated result for one status/body pair. */
export type ClientResult<TStatus extends number, TBody> =
  | ClientSuccess<TStatus, TBody>
  | ClientFailure<TStatus, TBody>;

const BODILESS_STATUSES = new Set([204, 205, 304]);

function isJsonMedia(mediaType: string): boolean {
  return (
    mediaType === "application/json" ||
    mediaType === "application/problem+json" ||
    (mediaType.startsWith("application/") && mediaType.endsWith("+json"))
  );
}

/** Reads one body according to the media-type policy without consuming the original. */
async function readBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  const mediaType = contentType?.split(";")[0]?.trim().toLowerCase();
  if (mediaType === undefined || mediaType === "" || BODILESS_STATUSES.has(response.status)) {
    return undefined;
  }
  if (isJsonMedia(mediaType)) {
    try {
      return await response.clone().json();
    } catch {
      return undefined;
    }
  }
  if (mediaType.startsWith("text/")) {
    return await response.clone().text();
  }
  return undefined;
}

/**
 * Parses one response into a discriminated result keyed by the actual
 * status. Never throws for HTTP outcomes; network/transport failures are
 * untouched fetch behavior (M3-013).
 */
export async function parseResponse(
  response: Response,
): Promise<ClientResult<number, unknown>> {
  const body = await readBody(response);
  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      data: body,
      response,
    };
  }
  return {
    ok: false,
    status: response.status,
    error: body,
    response,
  };
}
