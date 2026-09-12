/**
 * `formBody()` — the typed client's multipart body wrapper (RF-3 roadmap
 * item 3: multipart through the typed client).
 *
 * The route contract is compile-time only and is erased before dispatch, so
 * the client needs a RUNTIME discriminator to select the multipart encoder.
 * The wrapper is that discriminator: an explicit, frozen `{ multipart: true,
 * values }` object produced by `formBody()` — the contract requires it
 * exactly for routes whose `body` slot is a `form()` descriptor. Native
 * `File`/`Blob` values are preserved as parts; a flat array sends one part
 * per element under the same field name. The platform generates the
 * multipart boundary: the client never sets `content-type` for a multipart
 * body, and a caller-supplied content type is a conflict (`LUGAS_CLIENT_008`).
 */
import type { FormBodyInput, FormBodyValues } from "../core/form";
import { ClientRequestError } from "./request";

export function formBody(values: FormBodyValues): FormBodyInput {
  if (typeof values !== "object" || values === null || Array.isArray(values)) {
    throw new ClientRequestError("LUGAS_CLIENT_008", "formBody(): values must be a plain object");
  }
  const frozen: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    frozen[key] = Array.isArray(value) ? Object.freeze([...value]) : value;
  }
  return Object.freeze({ multipart: true as const, values: Object.freeze(frozen) }) as FormBodyInput;
}
