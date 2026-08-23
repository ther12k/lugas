/**
 * Method-specific path and input lookup types for the typed client (M3-002).
 *
 * Derives, per HTTP method, the set of supported literal paths and the exact
 * structured input fields (path params, query, headers, body) a client call
 * must supply. Lookups are indexed per method/path pair instead of distributing
 * over the whole contract.
 */
import type { AppContract } from "../core/contract";
import type { HttpMethod } from "../core/types";

/** Extracts `:param` names from a literal path such as `/users/:id/posts/:slug`. */
export type PathParams<TPath extends string> =
  TPath extends `${string}:${infer Name}/${infer Rest}`
    ? { readonly [K in Name]: string } & PathParams<Rest>
    : TPath extends `${string}:${infer Name}`
    ? { readonly [K in Name]: string }
    : {};

/** Union of paths that support the given method (including `ALL` handlers). */
export type PathsForMethod<TContract, TMethod extends HttpMethod> = TContract extends Record<string, unknown>
  ? {
      [P in keyof TContract]: TContract[P] extends Record<string, unknown>
        ? TMethod extends keyof TContract[P]
          ? P & string
          : "ALL" extends keyof TContract[P]
          ? P & string
          : never
        : never;
    }[keyof TContract]
  : never;

export type ClientInput<TEntry> = TEntry extends { readonly input: infer I }
  ? {
      readonly params: I extends { readonly params?: infer P } ? (P extends undefined ? undefined : P) : undefined;
      readonly query: I extends { readonly query?: infer Q } ? (Q extends undefined ? undefined : Q) : undefined;
      readonly headers: I extends { readonly headers?: infer H } ? (H extends undefined ? undefined : H) : undefined;
      readonly body: I extends { readonly body?: infer B } ? (B extends undefined ? undefined : B) : undefined;
    }
  : {
      readonly params: undefined;
      readonly query: undefined;
      readonly headers: undefined;
      readonly body: undefined;
    };

export type RouteEntryForMethod<
  TContract,
  TPath extends string,
  TMethod extends HttpMethod,
> = TContract extends Record<string, unknown>
  ? TPath extends keyof TContract
    ? TContract[TPath] extends Record<string, unknown>
      ? TMethod extends keyof TContract[TPath]
        ? TContract[TPath][TMethod]
        : "ALL" extends keyof TContract[TPath]
        ? TContract[TPath]["ALL"]
        : never
      : never
    : never
  : never;

export type ClientCallInput<
  TContract,
  TPath extends string,
  TMethod extends HttpMethod,
> = ClientInput<RouteEntryForMethod<TContract, TPath, TMethod>> & {
  readonly pathParams: PathParams<TPath>;
};

/**
 * Status-discriminated client outcome for a single response (M3-003).
 * Raw (unbranded) Responses widen conservarily to `{ status: number; body: unknown }`.
 */
export type ClientOutcome<TResponse> = TResponse extends import("../core/response").TypedResponse<
  infer S extends number,
  infer B
>
  ? { readonly status: S; readonly body: B }
  : never;

/**
 * Full union of client outcomes for a route entry's responses (M3-003).
 * Supports conditional handler returns and async handlers via `Awaited`.
 */
export type ClientOutcomes<TEntry> = TEntry extends { readonly responses: infer R }
  ? ClientOutcome<Awaited<R>>
  : never;

/**
 * Per-method/path client outcome union (M3-004).
 *
 * Merges ordered guard short-circuit responses with handler responses through
 * the single indexed `RouteEntryForMethod` lookup, so guard statuses (e.g.
 * 401/403) and handler statuses appear in one discriminated union without
 * re-expanding the whole contract per client method.
 */
export type ClientOutcomesFor<
  TContract,
  TPath extends string,
  TMethod extends HttpMethod,
> = ClientOutcomes<RouteEntryForMethod<TContract, TPath, TMethod>>;

/**
 * Explicit lower-case client method bound to one HTTP verb (M3-007).
 * The path parameter is restricted to the literal paths whose contract entry
 * supports that verb (including `ALL` entries); unsupported combinations are
 * compile errors.
 *
 * Since M3-008 the method accepts an optional input object whose `params`
 * field is required exactly when the chosen path declares `:name` segments;
 * values are interpolated and encoded before dispatch.
 */
export type MethodParamsInput<TPath extends string> =
  keyof PathParams<TPath> extends never
    ? { readonly params?: undefined }
    : { readonly params: PathParams<TPath> };

/**
 * Query input slot for a method call (M3-009): required exactly when the
 * route entry declares a `query` schema; values mirror the schema's output
 * type and are serialized as repeated scalar keys.
 */
export type MethodQueryInput<TContract, TPath extends string, TMethod extends HttpMethod> =
  ClientInput<RouteEntryForMethod<TContract, TPath, TMethod>>["query"] extends infer Q
    ? [Q] extends [undefined]
      ? { readonly query?: undefined }
      : { readonly query: Exclude<Q, undefined> }
    : never;

export type MethodCallInput<TContract, TPath extends string, TMethod extends HttpMethod> =
  MethodParamsInput<TPath> & MethodQueryInput<TContract, TPath, TMethod>;

export type ClientMethod<TContract, TMethod extends HttpMethod> = <
  TPath extends PathsForMethod<TContract, TMethod>,
>(
  path: TPath,
  input?: MethodCallInput<TContract, TPath, TMethod>,
) => Promise<Response>;

/**
 * Generic `request` escape hatch (M3-007). Accepts any path with a supported
 * uppercase verb; it never weakens the canonical methods, which keep
 * method-specific path restrictions and inference.
 */
export type ClientRequestEscapeHatch = (
  method: HttpMethod,
  path: string,
) => Promise<Response>;
