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
import type { FormBodyInput } from "../core/form";
import type { NormalizedValidationIssue } from "../internal/validation-issues";
import type { ClientFailure, ClientResult, ClientSuccess } from "./parse-response";

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
 *
 * Framework-generated failures (RF-3): routes that declare schemas can fail
 * before any user code runs — those outcomes join the union so a frontend can
 * branch on them without casts (see `FrameworkFailureOutcomes`).
 */
export type ClientOutcomesFor<
  TContract,
  TPath extends string,
  TMethod extends HttpMethod,
> = RouteEntryForMethod<TContract, TPath, TMethod> extends infer TEntry
  ? ClientOutcomes<TEntry> | FrameworkFailureOutcomes<TEntry>
  : never;

/**
 * Wire shape of the Problem Details documents the framework itself emits for
 * request validation/decoding failures (M2-009, `src/internal/validation-problem.ts`).
 * `code` and `status` are literal per failure kind; `issues` carries
 * adapter-specific fields beyond the normalized core.
 */
export type FrameworkProblemBody<Code extends string = string, Status extends number = number> = {
  readonly type: string;
  readonly title: string;
  readonly status: Status;
  readonly code: Code;
  readonly detail?: string | undefined;
  readonly source?: "params" | "query" | "headers" | "body" | undefined;
  readonly issues?: ReadonlyArray<NormalizedValidationIssue> | undefined;
};

/** A schema slot is "declared" in the contract when it is not `undefined`. */
type SlotDeclared<T> = [T] extends [undefined] ? false : true;

type ValidationFailedOutcome = {
  readonly status: 422;
  readonly body: FrameworkProblemBody<"VALIDATION_FAILED", 422>;
};

/** JSON-body route failures: parse (415/400) then validate (422). */
type JsonBodyFailureOutcomes =
  | ValidationFailedOutcome
  | { readonly status: 415; readonly body: FrameworkProblemBody<"UNSUPPORTED_MEDIA_TYPE", 415> }
  | { readonly status: 400; readonly body: FrameworkProblemBody<"MALFORMED_JSON", 400> };

/**
 * Multipart (`form()`) route failures: media type (415), platform parse
 * (400 MALFORMED_MULTIPART), and the Lugas-level 413s — both ALWAYS carry a
 * Problem Details body (FORM_LIMIT via the unconditional form() defaults;
 * BODY_BUDGET when a budget is configured). The BARE transport-ceiling 413
 * stays out of every union (see below).
 */
type MultipartFailureOutcomes =
  | { readonly status: 415; readonly body: FrameworkProblemBody<"UNSUPPORTED_MEDIA_TYPE", 415> }
  | { readonly status: 400; readonly body: FrameworkProblemBody<"MALFORMED_MULTIPART", 400> }
  | { readonly status: 413; readonly body: FrameworkProblemBody<"FORM_LIMIT_EXCEEDED" | "BODY_BUDGET_EXCEEDED", 413> };

/**
 * Framework failures derivable from a route entry's DECLARED capabilities
 * (RF-3, dogfood findings): schema slots make the framework's own rejection
 * outcomes possible regardless of handler code.
 *
 * - any declared schema slot (params/query/headers/body) → 422 VALIDATION_FAILED
 * - a declared standard-schema body additionally → 415 UNSUPPORTED_MEDIA_TYPE
 *   and 400 MALFORMED_JSON (the framework parses the body before validating)
 * - a `form()` body → the multipart failure set above (no 422: a form body
 *   has no schema to validate against; params/query/headers schemas on the
 *   same route still contribute 422 through their own branches)
 *
 * Deliberately NOT included:
 * - 413 for JSON-schema routes: budget applicability (route `budget`, app
 *   default, serve ceiling) is runtime configuration invisible to the type,
 *   and the transport ceiling emits a BARE 413 with no Problem document
 *   (`docs/body-limits.md`) — an out-of-union 413 still arrives safely
 *   through the runtime fallback (the decoder keys off the actual response,
 *   `parse-response.ts`).
 */
type FrameworkFailureOutcomes<TEntry> = TEntry extends { readonly input: infer I }
  ? (I extends { readonly body?: infer B }
      ? B extends FormBodyInput
        ? MultipartFailureOutcomes
        : SlotDeclared<B> extends true
        ? JsonBodyFailureOutcomes
        : never
      : never)
      | (I extends { readonly params?: infer P } ? (SlotDeclared<P> extends true ? ValidationFailedOutcome : never) : never)
      | (I extends { readonly query?: infer Q } ? (SlotDeclared<Q> extends true ? ValidationFailedOutcome : never) : never)
      | (I extends { readonly headers?: infer H } ? (SlotDeclared<H> extends true ? ValidationFailedOutcome : never) : never)
  : never;

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
 * route entry declares a `query` schema; values mirror the schema's wire
 * input type (M6R7) and are serialized as repeated scalar keys.
 */
export type MethodQueryInput<TContract, TPath extends string, TMethod extends HttpMethod> =
  ClientInput<RouteEntryForMethod<TContract, TPath, TMethod>>["query"] extends infer Q
    ? [Q] extends [undefined]
      ? { readonly query?: undefined }
      : { readonly query: Exclude<Q, undefined> }
    : never;

/**
 * Headers slot for a method call (M3-010): required exactly when the route
 * entry declares a `headers` schema; values mirror the schema's wire input
 * type (M6R7).
 */
export type MethodHeadersInput<TContract, TPath extends string, TMethod extends HttpMethod> =
  ClientInput<RouteEntryForMethod<TContract, TPath, TMethod>>["headers"] extends infer H
    ? [H] extends [undefined]
      ? { readonly headers?: undefined }
      : { readonly headers: Exclude<H, undefined> }
    : never;

/**
 * Body slot for a method call (M3-010): required exactly when the route entry
 * declares a `body` schema; values mirror the schema's wire input type
 * (M6R7) and are serialized as JSON.
 */
export type MethodBodyInput<TContract, TPath extends string, TMethod extends HttpMethod> =
  ClientInput<RouteEntryForMethod<TContract, TPath, TMethod>>["body"] extends infer B
    ? [B] extends [undefined]
      ? { readonly body?: undefined }
      : { readonly body: Exclude<B, undefined> }
    : never;

/** Platform options that stay owned by the caller (M3-010). */
export type MethodPlatformInit = {
  readonly init?: Omit<RequestInit, "method" | "body" | "headers">;
};

export type MethodCallInput<TContract, TPath extends string, TMethod extends HttpMethod> =
  MethodParamsInput<TPath> &
    MethodQueryInput<TContract, TPath, TMethod> &
    MethodHeadersInput<TContract, TPath, TMethod> &
    MethodBodyInput<TContract, TPath, TMethod> &
    MethodPlatformInit;

/** True when the path declares at least one `:param` segment. */
type HasParams<TPath extends string> = keyof PathParams<TPath> extends never ? false : true;

type QueryRequired<C, P extends string, M extends HttpMethod> = MethodQueryInput<C, P, M> extends { readonly query?: undefined } ? false : true;
type HeadersRequired<C, P extends string, M extends HttpMethod> = MethodHeadersInput<C, P, M> extends { readonly headers?: undefined } ? false : true;
type BodyRequired<C, P extends string, M extends HttpMethod> = MethodBodyInput<C, P, M> extends { readonly body?: undefined } ? false : true;

/**
 * Whether a route requires a structured input object: any declared
 * params/query/headers/body slot makes the whole input argument required.
 */
export type RequiresInput<TContract, TPath extends string, TMethod extends HttpMethod> =
  HasParams<TPath> extends true
    ? true
    : [QueryRequired<TContract, TPath, TMethod>, HeadersRequired<TContract, TPath, TMethod>, BodyRequired<TContract, TPath, TMethod>] extends [false, false, false]
    ? false
    : true;

export type ClientMethod<TContract, TMethod extends HttpMethod> = <
  TPath extends PathsForMethod<TContract, TMethod>,
>(
  ...args: RequiresInput<TContract, TPath, TMethod> extends true
    ? [
        path: TPath,
        input: MethodCallInput<TContract, TPath, TMethod>,
      ]
    : [
        path: TPath,
        input?: MethodCallInput<TContract, TPath, TMethod>,
      ]
) => Promise<ClientCallResult<TContract, TPath, TMethod>>;

/**
 * Runtime-truth branch for one compile-time outcome (M3-011): 2xx literal
 * statuses become successes, other literals become failures, and widened
 * `number` statuses stay open as either branch with `unknown` payloads.
 */
export type StatusBranch<S> = [S] extends [never]
  ? never
  : number extends S
  ? boolean
  : `${S & number}` extends `2${string}`
  ? true
  : false;

type ResultForStatus<S, B> = [StatusBranch<S>] extends [true]
  ? ClientSuccess<S extends number ? S : number, B>
  : [StatusBranch<S>] extends [false]
  ? ClientFailure<S extends number ? S : number, B>
  : ClientResult<number, unknown>;

export type ClientResultForOutcome<O> = O extends {
  readonly status: infer S;
  readonly body: infer B;
}
  ? ResultForStatus<S, B>
  : never;

export type ClientCallResult<TContract, TPath extends string, TMethod extends HttpMethod> =
  ClientResultForOutcome<ClientOutcomesFor<TContract, TPath, TMethod>>;

/**
 * Generic `request` escape hatch (M3-007). Accepts any path with a supported
 * uppercase verb; it never weakens the canonical methods, which keep
 * method-specific path restrictions and inference.
 */
export type ClientRequestEscapeHatch = (
  method: HttpMethod,
  path: string,
) => Promise<Response>;
