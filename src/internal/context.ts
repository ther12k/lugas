/**
 * Base request context and guard enrichment merging (M1-011, M2-011, M4R1-003).
 *
 * Provides collision-safe context construction for route handlers and guards.
 * Prevents guard enrichments from overwriting framework-owned properties:
 * `request`, `services`, `params`, plus validated slots `query`, `headers`,
 * `body` (reserved even when a route declares no schema for them).
 */
import type { RouteHandler } from "../core/types";

export type BaseContext<TServices = unknown, TParams extends Record<string, string> = Record<string, string>> = {
  readonly request: Request;
  readonly services: TServices;
  readonly params: TParams;
};

export const BASE_CONTEXT_RESERVED_KEYS = new Set([
  "request",
  "services",
  "params",
  "query",
  "headers",
  "body",
]);

export function createContext<TServices, TParams extends Record<string, string>>(
  request: Request,
  services: TServices,
  params: TParams,
): BaseContext<TServices, TParams> {
  return { request, services, params };
}

export function mergeEnrichedContext<TServices, TParams extends Record<string, string>>(
  base: BaseContext<TServices, TParams>,
  enrichment: Readonly<Record<string, unknown>>,
): BaseContext<TServices, TParams> & Readonly<Record<string, unknown>> {
  for (const key of Object.keys(enrichment)) {
    if (BASE_CONTEXT_RESERVED_KEYS.has(key)) {
      throw new Error(`Guard enrichment cannot overwrite reserved context key '${key}'`);
    }
  }
  return Object.freeze({ ...base, ...enrichment });
}

export type ContextualHandler<
  TServices,
  TParams extends Record<string, string> = Record<string, string>,
  TEnrichment = {},
> = RouteHandler<TServices, BaseContext<TServices, TParams> & TEnrichment>;
