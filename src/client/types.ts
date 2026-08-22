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
          ? P
          : "ALL" extends keyof TContract[P]
          ? P
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
