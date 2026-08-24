/**
 * `route()` descriptor factory (M1-004, M2-014).
 *
 * A route is an immutable descriptor, never a handler. Local invariants are
 * checked at creation so misconfiguration fails at startup, not per request:
 * exactly one function `handler`, and no unknown keys (typos must not pass
 * silently). Accepts optional schemas (`params`, `query`, `headers`, `body`)
 * and ordered guard descriptors (`before`).
 */
import { diagnostic } from "../internal/diagnostics";
import { brand } from "../internal/brands";
import { type RouteContext, type SchemaOutputOrRawParams } from "../internal/context";
import type { GuardDescriptor, RouteDescriptor, RouteHandler } from "./types";

/**
 * Handler context is DERIVED from the declared schemas and guard chain
 * (M4R1-005): schema outputs for `query` / `headers` / `body`, transformed
 * outputs for `params`, ordered guard enrichments — see `RouteContext` in
 * `src/internal/context.ts`.
 */
export type RouteConfig<
  TServices = unknown,
  TContext = unknown,
  TParams = unknown,
  TQuery = unknown,
  THeaders = unknown,
  TBody = unknown,
  TReturn = Response | Promise<Response>,
  TGuards extends ReadonlyArray<GuardDescriptor<TServices, any>> = ReadonlyArray<GuardDescriptor<TServices, never>>,
> = {
  handler: (
    context: RouteContext<TServices, TParams, TQuery, THeaders, TBody, TGuards> & TContext,
  ) => TReturn;
  before?: TGuards;
  params?: TParams;
  query?: TQuery;
  headers?: THeaders;
  body?: TBody;
};

const ROUTE_KEYS = new Set(["handler", "before", "params", "query", "headers", "body"]);

export function route<
  TServices = unknown,
  TContext = unknown,
  const TParams = undefined,
  const TQuery = undefined,
  const THeaders = undefined,
  const TBody = undefined,
  TReturn extends Response | Promise<Response> = Response | Promise<Response>,
  const TGuards extends ReadonlyArray<GuardDescriptor<any, any>> = readonly [],
>(
  config: RouteConfig<TServices, TContext, TParams, TQuery, THeaders, TBody, TReturn, TGuards>,
): RouteDescriptor<
  TServices,
  RouteContext<TServices, TParams, TQuery, THeaders, TBody, TGuards> & TContext,
  TParams,
  TQuery,
  THeaders,
  TBody,
  TReturn,
  TGuards
> {
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_ROUTE_001", "route(): config must be an object", { hint: "pass route({ handler })" });
  }
  for (const key of Object.keys(config)) {
    if (!ROUTE_KEYS.has(key)) {
      throw diagnostic("LUGAS_ROUTE_002", `route(): unknown config key '${key}'`, {
        hint: "allowed keys: handler, before, params, query, headers, body",
        context: { key },
      });
    }
  }
  if (typeof config.handler !== "function") {
    throw diagnostic("LUGAS_ROUTE_003", "route(): 'handler' must be a function", { hint: "handler receives the validated context and returns a Response" });
  }
  if (config.before !== undefined) {
    if (!Array.isArray(config.before)) throw diagnostic("LUGAS_ROUTE_004", "route(): 'before' must be an array of guard descriptors", { hint: "list guards in execution order: before: [authGuard]" });
    for (const g of config.before) {
      if (typeof g !== "object" || g === null || typeof (g as GuardDescriptor).name !== "string") {
        throw diagnostic("LUGAS_ROUTE_005", "route(): 'before' entries must be guard() descriptors", { hint: "create guards with guard({ name, handler })" });
      }
    }
  }
  return brand(
    Object.freeze({
      handler: config.handler,
      before: (config.before ?? []) as TGuards,
      params: config.params,
      query: config.query,
      headers: config.headers,
      body: config.body,
    }),
    "RouteDescriptor",
  );
}
