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
 * Compile-time mirror of what `JSON.stringify` actually puts on the wire
 * (M6R7): `toJSON` results are unwrapped (`Date` arrives as `string`),
 * values that are always `undefined`/function/symbol are dropped, `Map`/`Set`
 * serialize to an empty object, and `bigint` makes `stringify` throw (typed
 * `never` so no usable value is promised). Keys whose value is only
 * *possibly* `undefined` stay, carrying `undefined`; array elements typed
 * `undefined` arrive as `null`. Everything else round-trips unchanged.
 */
export type Jsonify<T> = 0 extends 1 & T
  ? T
  : T extends { readonly toJSON: () => infer J }
    ? Jsonify<J>
    : T extends Function | symbol | undefined | void
      ? never
      : T extends bigint
        ? never
        : T extends string | number | boolean | null
          ? T
          : T extends readonly unknown[]
            ? { [K in keyof T]: JsonifyElement<T[K]> }
            : T extends Map<unknown, unknown> | Set<unknown>
              ? Record<string, never>
              : T extends object
                ? { [K in keyof T as T[K] extends Function | symbol | undefined ? never : K]: JsonifyMember<T[K]> }
                : T;

/** Value position for object members: a possibly-`undefined` value may be absent on the wire. */
type JsonifyMember<V> = Jsonify<Exclude<V, undefined>> | (undefined extends V ? undefined : never);

/** Element position for arrays: `JSON.stringify` serializes `undefined` elements as `null`. */
type JsonifyElement<V> = Jsonify<Exclude<V, undefined>> | (undefined extends V ? null : never);

/**
 * `json(status, body, init?)`
 *
 * Header precedence is deterministic: `init.headers` wins when it sets
 * `content-type`; otherwise `application/json; charset=utf-8` is applied.
 *
 * The response brand carries `Jsonify<B>` (M6R7), not raw `B`: the typed body
 * facts clients observe reflect what `JSON.stringify` actually serializes.
 */
export function json<S extends number, B>(status: S, body: B, init?: ResponseInit): TypedResponse<S, Jsonify<B>> {
  const headers = new Headers(init?.headers as Bun.HeadersInit | undefined);
  if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, status, headers }) as TypedResponse<S, Jsonify<B>>;
}

/**
 * `text(status, body, init?)` — `text/plain; charset=utf-8` unless the
 * caller overrides content-type.
 */
export function text<S extends number, B extends string>(status: S, body: B, init?: ResponseInit): TypedResponse<S, B> {
  const headers = new Headers(init?.headers as Bun.HeadersInit | undefined);
  if (!headers.has("content-type")) headers.set("content-type", "text/plain; charset=utf-8");
  return new Response(body, { ...init, status, headers }) as TypedResponse<S, B>;
}

/** `empty(status, init?)` — bodyless response (204/304 and friends). */
export function empty<S extends number>(status: S, init?: ResponseInit): TypedResponse<S, undefined> {
  return new Response(null, { ...init, status }) as TypedResponse<S, undefined>;
}

export const PROBLEM_CONTENT_TYPE = "application/problem+json";

export type ProblemFields = {
  type?: string | undefined;
  title?: string | undefined;
  detail?: string | undefined;
  instance?: string | undefined;
} & Record<string, unknown>;

const PROBLEM_RESERVED = new Set(["type", "title", "detail", "instance"]);

/**
 * `problem(status, fields, init?)` — RFC 9457 problem details. Extension
 * members are bounded: string/number/boolean values pass through; nested
 * objects/arrays are serialized but flagged length-bounded by the caller's
 * responsibility (M2-009 normalizes issue extensions).
 */
export function problem<S extends number>(status: S, fields: ProblemFields, init?: ResponseInit): TypedResponse<S, ProblemFields> {
  const headers = new Headers(init?.headers as Bun.HeadersInit | undefined);
  if (!headers.has("content-type")) headers.set("content-type", PROBLEM_CONTENT_TYPE);
  const members: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    members[key] = value;
  }
  return new Response(JSON.stringify(members), { ...init, status, headers }) as TypedResponse<S, ProblemFields>;
}

export const REDIRECT_STATUSES = [301, 302, 303, 307, 308] as const;
export type RedirectStatus = (typeof REDIRECT_STATUSES)[number];

/** `redirect(location, status?)` — 302 default; only 3xx redirect statuses allowed. */
export function redirect(location: string | URL, status: RedirectStatus = 302): TypedResponse<RedirectStatus, undefined> {
  const href = location instanceof URL ? location.href : location;
  return new Response(null, { status, headers: { location: href } }) as TypedResponse<RedirectStatus, undefined>;
}
