/**
 * Typed native responses (M1-002).
 *
 * Every helper returns a genuine `Response`. Compile-time status/body facts
 * ride a phantom brand (ADR-0006): the brand is optional so the object still
 * structurally satisfies `Response` everywhere, and it is never enumerable
 * at runtime — the runtime object IS the native Response.
 */
declare const typedResponseBrand: unique symbol;

export type TypedResponse<S extends number = number, B = unknown> = Response & {
  readonly [typedResponseBrand]?: { readonly status: S; readonly body: B };
};

/**
 * `json(status, body, init?)`
 *
 * Header precedence is deterministic: `init.headers` wins when it sets
 * `content-type`; otherwise `application/json; charset=utf-8` is applied.
 */
export function json<S extends number, B>(status: S, body: B, init?: ResponseInit): TypedResponse<S, B> {
  const headers = new Headers(init?.headers as Bun.HeadersInit | undefined);
  if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, status, headers }) as TypedResponse<S, B>;
}
