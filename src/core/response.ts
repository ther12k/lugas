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
 * (M6R7–M6R10). Modeled per ECMA-262 `SerializeJSONProperty`: at each
 * serialization position the value's `toJSON` is invoked **at most once**
 * (with the property key), the result replaces the value, and serialization
 * proceeds — a `toJSON` found on the replacement is *not* re-entered at the
 * same position; only member/element positions start fresh hook
 * opportunities. A general `number` widens to `number | null`
 * (`NaN`/`±Infinity` serialize as `null`; finite literals stay exact).
 * Values that serialize to `undefined` (functions, symbols, `undefined`,
 * `void`, or a hook result that is one of those) are dropped from objects
 * and substituted as `null` in array elements; members that only *may* drop
 * become optional properties. `Map`/`Set` serialize to an empty object.
 * Two exceptions are explicit and distinct: a `bigint` at any position —
 * including as a hook result — makes `JSON.stringify` throw a `TypeError`
 * before a wire representation exists (a throw-signal typed `never`, never
 * conflated with a drop), and root bodies that serialize to no JSON text
 * are rejected by `json()` with `LUGAS_RESPONSE_005`.
 */
export type Jsonify<T> = StripThrows<JsonifyRaw<T>>;

/** Hook application at one position: `toJSON` invoked at most once, key-bearing signatures accepted (M6R10). */
type HookOnce<T> = T extends { readonly toJSON: (key: string) => infer J } ? J : T;

/**
 * Internal sentinel for "serialization throws" (bigint at any position,
 * including hook results). Distinct from `never` (= "serializes to
 * `undefined`": dropped/null) so drop classification can never conflate the
 * two outcomes (M6R10).
 */
declare const jsonThrowsSentinel: unique symbol;
type JsonThrows = typeof jsonThrowsSentinel;

/**
 * Post-hook serialization at one position: no further `toJSON` is consulted
 * here. Member and element positions restart from `JsonifyProperty` /
 * `JsonifyElement`, which each apply `HookOnce` once more — matching the
 * specification's per-position hook.
 */
type JsonifyAfterHook<T> =
  0 extends 1 & T
    ? T
    : T extends Function | symbol | undefined | void
      ? never
      : T extends bigint
        ? JsonThrows
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

/** Raw post-hook wire type at one position (throw positions carry the sentinel). */
type JsonifyRaw<T> = JsonifyAfterHook<HookOnce<T>>;

/** Public value positions: a throw means no value ever exists — typed `never`, not a wire type. */
type StripThrows<T> = T extends JsonThrows ? never : T;

/** Member value position: fresh `HookOnce`, throw stripped to `never` (M6R10). */
type JsonifyProperty<V> = StripThrows<JsonifyRaw<V>>;

/** General `number` may be `NaN`/`±Infinity`, which serialize as JSON `null`; finite numeric literals stay exact (M6R9). */
type JsonifyNumber<N extends number> = number extends N ? N | null : N;

/**
 * Per-member: does this value serialize to `undefined` (so the key is
 * omitted)? Classified from the raw post-hook result — `never` means drop;
 * the throw sentinel is explicitly NOT a drop (M6R10).
 */
type MemberDrops<V> = V extends V
  ? [JsonifyRaw<V>] extends [never]
    ? true
    : false
  : never;

type DropFlags<T> = { [K in keyof T]: MemberDrops<T[K]> };

/**
 * Object position (M6R9/M6R10): members that never drop stay required; members
 * that may drop become optional with the non-dropped value type; members
 * that always drop are removed entirely; members whose serialization throws
 * stay required with `never`. Key decisions come from the pre-evaluated flag
 * object; the two complementary keysets are flattened into one object type
 * so the brand stays identity-comparable with plain object literals.
 * (Non-homomorphic mapping: `readonly` modifiers on bodies are not carried
 * into the brand — wire payloads are freshly decoded.)
 */
type JsonifyObject<T extends object> = Simplify<
  { [K in RequiredKeys<T>]: JsonifyProperty<T[K]> } & { [K in OptionalKeys<T>]?: JsonifyProperty<T[K]> }
>;

type RequiredKeys<T> = { [K in keyof DropFlags<T>]: DropFlags<T>[K] extends false ? K : never }[keyof T];
type OptionalKeys<T> = { [K in keyof DropFlags<T>]: true extends DropFlags<T>[K] ? (false extends DropFlags<T>[K] ? K : never) : never }[keyof T];

/** Single homomorphic pass that flattens intersections without losing modifiers or index signatures. */
type Simplify<T> = { [K in keyof T]: T[K] };

/**
 * Element position for arrays: `JSON.stringify` substitutes `null` for
 * elements that serialize to `undefined`; an element whose serialization
 * throws stays `never` (M6R10).
 */
type JsonifyElement<V> = V extends V
  ? StripThrows<JsonifyRaw<V>> extends infer E
    ? [E] extends [never]
      ? null
      : E
    : never
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
