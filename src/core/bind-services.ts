/**
 * `bindServices()` — service-bound descriptor factories (RF-1, dogfood
 * findings `docs/reports/dogfood-realworld-findings.md`).
 *
 * `route()`'s `TServices` slot cannot be supplied without pinning every other
 * generic parameter (schema slots, guard chain, return type) to its default,
 * so applications constructing routes independently of `defineApp()` either
 * cast (`ctx.services as Services`) or lose schema inference. The factory
 * below binds `TServices` ONCE and returns `route`/`guard` functions whose
 * remaining generic parameters are inferred per descriptor exactly as the
 * plain factories infer them — the bound functions delegate to `route()` and
 * `guard()` with every parameter forwarded, so validation, branding, and
 * freezing have exactly one implementation.
 *
 * No container, no runtime lookup: binding is compile-time only; the runtime
 * path is indistinguishable from the plain factories'.
 */
import { route } from "./route";
import { guard } from "./guard";
import type { RouteConfig } from "./route";
import type { GuardConfig } from "./guard";
import type { GuardDescriptor, RouteDescriptor } from "./types";
import type { RouteContext } from "../internal/context";

/** The service-bound factories: same inference as `route()`/`guard()`, with `TServices` pre-bound. */
export type ServiceBound<TServices> = {
  route: <
    TContext = unknown,
    const TParams = undefined,
    const TQuery = undefined,
    const THeaders = undefined,
    const TBody = undefined,
    TReturn extends Response | Promise<Response> = Response | Promise<Response>,
    const TGuards extends ReadonlyArray<GuardDescriptor<any, any>> = readonly [],
  >(
    config: RouteConfig<TServices, TContext, TParams, TQuery, THeaders, TBody, TReturn, TGuards>,
  ) => RouteDescriptor<
    TServices,
    RouteContext<TServices, TParams, TQuery, THeaders, TBody, TGuards> & TContext,
    TParams,
    TQuery,
    THeaders,
    TBody,
    TReturn,
    TGuards
  >;
  guard: <TResult extends object>(config: GuardConfig<TServices, TResult>) => GuardDescriptor<TServices, TResult>;
};

export function bindServices<TServices>(): ServiceBound<TServices> {
  // Every generic parameter is forwarded explicitly: inference happens at
  // the caller (schema slots, guard chain, return type all inferred), while
  // TServices stays fixed by this function's argument.
  const boundRoute = <
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
  > => route<TServices, TContext, TParams, TQuery, THeaders, TBody, TReturn, TGuards>(config);
  const boundGuard = <TResult extends object>(config: GuardConfig<TServices, TResult>): GuardDescriptor<TServices, TResult> =>
    guard<TServices, TResult>(config);
  return { route: boundRoute, guard: boundGuard };
}
