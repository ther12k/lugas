/**
 * Stable client error surface (M3-012).
 *
 * Frozen decode policy: when a response declares a JSON-compatible media
 * type but its body cannot be parsed as JSON, the client throws a
 * `ClientDecodeError` carrying the original `Response` for full manual
 * access. The error never includes body content in its message, so server
 * payloads cannot leak through logs.
 */

export const CLIENT_DECODE_ERROR_CODE = "LUGAS_CLIENT_010";

export class ClientDecodeError extends Error {
  readonly code: typeof CLIENT_DECODE_ERROR_CODE;
  /** The untouched original response (body remains readable via clone policy). */
  readonly response: Response;
  readonly status: number;
  readonly contentType: string | null;

  constructor(response: Response, cause?: unknown) {
    const contentType = response.headers.get("content-type");
    super(`${CLIENT_DECODE_ERROR_CODE}: failed to decode declared JSON body`, { cause });
    this.name = "ClientDecodeError";
    this.code = CLIENT_DECODE_ERROR_CODE;
    this.response = response;
    this.status = response.status;
    this.contentType = contentType;
  }
}
