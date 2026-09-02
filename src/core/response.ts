/**
 * Typed native responses (M1-002).
 *
 * Every helper returns a genuine `Response`. Compile-time status/body facts
 * ride a phantom brand (ADR-0006): the brand is optional so the object still
 * structurally satisfies `Response` everywhere, and it is never enumerable
 * at runtime — the runtime object IS the native Response.
 */
import { diagnostic } from "../internal/diagnostics";

declare const typedResponseBrand: unique symbol;

export type TypedResponse<S extends number = number, B = unknown> = Response & {
  readonly [typedResponseBrand]?: { readonly status: S; readonly body: B };
};

/**
 * Compile-time mirror of what `JSON.stringify` actually puts on the wire
 * (M6R7–M6R9). `toJSON` results are unwrapped recursively (`Date` arrives as
 * `string`); values that serialize to `undefined` — functions, symbols,
 * `undefined`, `void`, or a `toJSON` chain ending in one — are dropped from
 * objects and substituted as `null` in array elements; members that only
 * *may* drop become optional properties; general `number` widens to
 * `number | null` because `NaN` and `±Infinity` serialize as `null` (finite
 * numeric literals stay exact); `Map`/`Set` serialize to an empty object.
 * Two exceptions are explicit: a `bigint` anywhere makes `JSON.stringify`
 * throw a `TypeError` before a wire representation exists (typed `never` — a
 * throw-signal, not a wire type), and root bodies that serialize to no JSON
 * text are rejected by `json()` with `LUGAS_RESPONSE_005`.
 */
export type Jsonify<T> = 0 extends 1 & T
  ? T
  : T extends { readonly toJSON: () => infer J }
    ? Jsonify<J>
    : T extends Function | symbol | undefined | void
      ? never
      : T extends bigint
        ? never
        : T extends number
          ? JsonifyNumber<T>
          : T extends string | boolean | null
            ? T
            : T extends readonly unknown[]
              ? { [K in keyof T]: JsonifyElement<T[K]> }
              : T extends Map<unknown, unknown> | Set<unknown>
                ? Record<string, never>
                : T extends object
                  ? JsonifyObject<T>
                  : T;

/** General `number` may be `NaN`/`±Infinity`, which serialize as JSON `null`; finite numeric literals stay exact (M6R9). */
type JsonifyNumber<N extends number> = number extends N ? N | null : N;

/**
 * Per-member: does this value serialize to `undefined` (so the key is
 * omitted)? Every `undefined`-serializing member of `T[K]` makes `Jsonify<V>`
 * `never`, so the drop test piggybacks on `Jsonify` itself — which evaluates
 * reliably per key — instead of running a separate recursion inside keyset
 * computation. `bigint` members throw instead of dropping and are never
 * classified as dropped (M6R9).
 */
type MemberDrops<V> = V extends V
  ? [V] extends [bigint]
    ? false
    : [Jsonify<V>] extends [never]
      ? true
      : false
  : never;

type DropFlags<T> = { [K in keyof T]: MemberDrops<T[K]> };

/**
 * Object position (M6R9): members that never drop stay required; members
 * that may drop become optional with the non-dropped value type; members
 * that always drop are removed entirely. Key decisions come from the
 * pre-evaluated flag object; the two complementary keysets are flattened
 * into one object type so the brand stays identity-comparable with plain
 * object literals. (Non-homomorphic mapping: `readonly` modifiers on bodies
 * are not carried into the brand — wire payloads are freshly decoded.)
 */
type JsonifyObject<T extends object> = Simplify<
  { [K in RequiredKeys<T>]: Jsonify<T[K]> } & { [K in OptionalKeys<T>]?: Jsonify<T[K]> }
>;

type RequiredKeys<T> = { [K in keyof DropFlags<T>]: DropFlags<T>[K] extends false ? K : never }[keyof T];
type OptionalKeys<T> = { [K in keyof DropFlags<T>]: true extends DropFlags<T>[K] ? (false extends DropFlags<T>[K] ? K : never) : never }[keyof T];

/** Single homomorphic pass that flattens intersections without losing modifiers or index signatures. */
type Simplify<T> = { [K in keyof T]: T[K] };

/** Element position for arrays: `JSON.stringify` substitutes `null` for elements that serialize to `undefined` (M6R8/M6R9). */
type JsonifyElement<V> = V extends V
  ? V extends { readonly toJSON: () => infer J }
    ? JsonifyElement<J>
    : V extends Function | symbol | undefined | void
      ? null
      : Jsonify<V>
  : never;

/**
 * Normalized media type (lowercased, parameters stripped) of an explicit
 * `content-type` override, or `undefined` when the caller set none (M6R8).
 */
function overrideContentType(headers: Headers): string | undefined {
  const raw = headers.get("content-type");
  if (raw === null) return undefined;
  return raw.split(";")[0]?.trim().toLowerCase();
}

function isJsonMediaType(mediaType: string): boolean {
  return mediaType === "application/json" || (mediaType.startsWith("application/") && mediaType.endsWith("+json"));
}

/**
 * `json(status, body, init?)`
 *
 * Header precedence is deterministic: `init.headers` wins when it sets a
 * compatible `content-type`; otherwise `application/json; charset=utf-8` is
 * applied. `json()` owns JSON media types (`application/json`,
 * `application/*+json`): an incompatible explicit override throws
 * `LUGAS_RESPONSE_001` while constructing the response (M6R8), so the typed
 * client's JSON decode can never disagree with the brand.
 *
 * The response brand carries `Jsonify<B>` (M6R7), not raw `B`: the typed body
 * facts clients observe reflect what `JSON.stringify` actually serializes.
 */
export function json<S extends number, B>(status: S, body: B, init?: ResponseInit): TypedResponse<S, Jsonify<B>> {
  const headers = new Headers(init?.headers as Bun.HeadersInit | undefined);
  const override = overrideContentType(headers);
  if (override !== undefined && !isJsonMediaType(override)) {
    throw diagnostic("LUGAS_RESPONSE_001", "json(): content-type override is not a JSON media type", {
      hint: "json() owns application/json and application/*+json; omit the override or use text()",
      context: { contentType: override },
    });
  }
  const serialized = JSON.stringify(body);
  if (serialized === undefined) {
    throw diagnostic("LUGAS_RESPONSE_005", "json(): body serializes to no JSON text", {
      hint: "the body (or its toJSON result) is undefined; use empty() for a bodyless response",
    });
  }
  if (override === undefined) headers.set("content-type", "application/json; charset=utf-8");
  return new Response(serialized, { ...init, status, headers }) as TypedResponse<S, Jsonify<B>>;
}

/**
 * `text(status, body, init?)` — `text/plain; charset=utf-8` unless the caller
 * overrides content-type. `text()` owns `text/*`: an incompatible explicit
 * override throws `LUGAS_RESPONSE_002` while constructing the response
 * (M6R8), so the typed client's text decode can never disagree with the
 * brand.
 */
export function text<S extends number, B extends string>(status: S, body: B, init?: ResponseInit): TypedResponse<S, B> {
  const headers = new Headers(init?.headers as Bun.HeadersInit | undefined);
  const override = overrideContentType(headers);
  if (override !== undefined && !override.startsWith("text/")) {
    throw diagnostic("LUGAS_RESPONSE_002", "text(): content-type override is not a text media type", {
      hint: "text() owns text/*; omit the override or use json()",
      context: { contentType: override },
    });
  }
  if (override === undefined) headers.set("content-type", "text/plain; charset=utf-8");
  return new Response(body, { ...init, status, headers }) as TypedResponse<S, B>;
}

/** `empty(status, init?)` — bodyless response (204/304 and friends). A content-type override would advertise a body that cannot exist and throws `LUGAS_RESPONSE_004` (M6R8). */
export function empty<S extends number>(status: S, init?: ResponseInit): TypedResponse<S, undefined> {
  const override = overrideContentType(new Headers(init?.headers as Bun.HeadersInit | undefined));
  if (override !== undefined) {
    throw diagnostic("LUGAS_RESPONSE_004", "empty(): content-type override on a bodyless response", {
      hint: "empty() owns no body; a response without a body cannot declare a content type",
      context: { contentType: override },
    });
  }
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
 *
 * `problem()` owns `application/problem+json`: an incompatible explicit
 * content-type override throws `LUGAS_RESPONSE_003` while constructing the
 * response (M6R8).
 */
export function problem<S extends number>(status: S, fields: ProblemFields, init?: ResponseInit): TypedResponse<S, ProblemFields> {
  const headers = new Headers(init?.headers as Bun.HeadersInit | undefined);
  const override = overrideContentType(headers);
  if (override !== undefined && override !== PROBLEM_CONTENT_TYPE) {
    throw diagnostic("LUGAS_RESPONSE_003", "problem(): content-type override is not application/problem+json", {
      hint: "problem() owns application/problem+json (RFC 9457); omit the override or use json()",
      context: { contentType: override },
    });
  }
  if (override === undefined) headers.set("content-type", PROBLEM_CONTENT_TYPE);
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
