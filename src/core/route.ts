/**
 * `route()` descriptor factory (M1-004, M2-014).
 *
 * A route is an immutable descriptor, never a handler. Local invariants are
 * checked at creation so misconfiguration fails at startup, not per request:
 * exactly one function `handler`, and no unknown keys (typos must not pass
 * silently). Accepts optional schemas (`params`, `query`, `headers`, `body`)
 * and ordered guard descriptors (`before`).
 */
import { brand } from "../internal/brands";
import type { StandardSchema } from "../internal/standard-schema";
import type { GuardDescriptor, RouteDescriptor, RouteHandler } from "./types";

export type RouteConfig<TServices, TContext> = {
  handler: RouteHandler<TServices, TContext>;
  before?: ReadonlyArray<GuardDescriptor<TServices, unknown>>;
  params?: StandardSchema<any, any>;
  query?: StandardSchema<any, any>;
  headers?: StandardSchema<any, any>;
  body?: StandardSchema<any, any>;
};

const ROUTE_KEYS = new Set(["handler", "before", "params", "query", "headers", "body"]);

export function route<TServices, TContext>(
  config: RouteConfig<TServices, TContext>,
): RouteDescriptor<TServices, TContext> {
  if (typeof config !== "object" || config === null) {
    throw new Error("route(): config must be an object");
  }
  for (const key of Object.keys(config)) {
    if (!ROUTE_KEYS.has(key)) {
      throw new Error(
        `route(): unknown config key '${key}' (allowed: handler, before, params, query, headers, body)`,
      );
    }
  }
  if (typeof config.handler !== "function") {
    throw new Error("route(): 'handler' must be a function");
  }
  if (config.before !== undefined) {
    if (!Array.isArray(config.before)) throw new Error("route(): 'before' must be an array of guard descriptors");
    for (const g of config.before) {
      if (typeof g !== "object" || g === null || typeof (g as GuardDescriptor).name !== "string") {
        throw new Error("route(): 'before' entries must be guard() descriptors");
      }
    }
  }
  return brand(
    Object.freeze({
      handler: config.handler,
      before: config.before ?? [],
      params: config.params,
      query: config.query,
      headers: config.headers,
      body: config.body,
    }),
    "RouteDescriptor",
  );
}
