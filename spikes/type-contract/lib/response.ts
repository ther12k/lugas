/**
 * Phantom-typed native responses for the M0-009 spike.
 *
 * A `TypedResponse` IS a native `Response` at runtime (zero-cost brand via
 * unique-symbol phantom properties). `json`/`problem`/`empty` preserve the
 * exact status literal and body type; a raw `new Response(...)` contributes
 * the conservative `{ status: number; body: unknown }` contract because it
 * does not carry the phantom brand (phantom props are REQUIRED so a raw
 * `Response` fails the `extends TypedResponse<...>` check).
 */

declare const __lugasStatus: unique symbol;
declare const __lugasBody: unique symbol;

export interface TypedResponse<Status extends number, Body> extends Response {
  readonly [__lugasStatus]: Status;
  readonly [__lugasBody]: Body;
}

/** Body representation for bodyless responses (204/205/304). */
export type EmptyBody = null;

export function json<Status extends number, Body>(
  status: Status,
  body: Body,
): TypedResponse<Status, Body> {
  // Single documented brand point: construct native Response, widen its type.
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  }) as TypedResponse<Status, Body>;
}

export function problem<Status extends number, Body extends object>(
  status: Status,
  body: Body,
): TypedResponse<Status, Body> {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/problem+json" },
  }) as TypedResponse<Status, Body>;
}

export function empty<Status extends number>(status: Status): TypedResponse<Status, EmptyBody> {
  return new Response(null, { status }) as TypedResponse<Status, EmptyBody>;
}

/**
 * One member of the route's response contract, extracted distributively from
 * the handler/guard return union (async handlers are unwrapped first).
 * A raw (unbranded) `Response` widens conservatively.
 */
export type ResponseContract<R> =
  (R extends PromiseLike<infer Awaited> ? Awaited : R) extends TypedResponse<
    infer Status,
    infer Body
  >
    ? { readonly status: Status; readonly body: Body; readonly mediaType: "json" }
    : { readonly status: number; readonly body: unknown; readonly mediaType: string | null };
