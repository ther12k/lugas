/**
 * Base request context and guard enrichment merging (M1-011, M2-011,
 * M4R1-003) plus descriptor-derived handler context typing (M4R1-005).
 *
 * Runtime: collision-safe context construction for route handlers and
 * guards. Guard enrichments cannot overwrite framework-owned properties:
 * `request`, `services`, `params`, plus validated slots `query`, `headers`,
 * `body` (reserved even when a route declares no schema for them).
 *
 * Types: the handler context is COMPUTED from the route descriptor instead
 * of being manually annotated — schema outputs feed `params` / `query` /
 * `headers` / `body`, and ordered guard enrichments intersect in
 * declaration order. This mirrors the compiled pipeline exactly:
 *
 * - declared `params` schema → transformed output (e.g. coerced numbers);
 *   undeclared → raw string map;
 * - declared slot → required key with the validator OUTPUT type;
 *   undeclared slot → optional-undefined key (the pipeline still assigns
 *   `undefined`);
 * - guard contributions intersect in declaration order; colliding keys with
 *   different types surface as `never` instead of silently shadowing (the
 *   runtime throws on reserved-key collisions).
 */
import type { GuardDescriptor, RouteHandler } from "../core/types";
import type { StandardSchema, StandardSchemaOutput } from "./standard-schema";

export type BaseContext<
  TServices = unknown,
  TParams extends Record<string, unknown> = Record<string, unknown>,
> = {
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

export function createContext<TServices, TParams extends Record<string, unknown>>(
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

// ---------------------------------------------------------------------------
// Descriptor-derived route context (M4R1-005).
// ---------------------------------------------------------------------------

/** Params carry the validator's transformed output when declared. */
export type SchemaOutputOrRawParams<TParamsSchema> =
  TParamsSchema extends StandardSchema<any, infer Output>
    ? Output & Record<string, unknown>
    : Record<string, string>;

/**
 * One validated slot. Declared schemas contribute their OUTPUT as a required
 * readonly property (the pipeline always sets them after validation);
 * undeclared slots contribute an optional-undefined property so accidental
 * reads stay visible without breaking exactOptionalPropertyTypes.
 */
export type DeclaredSlot<Key extends string, TSchema> =
  TSchema extends StandardSchema<any, infer Output>
    ? { [P in Key]: Output }
    : { [P in Key]?: undefined };

/**
 * Non-response contribution of one guard. Short-circuit-only guards
 * (returning a Response on every path) contribute nothing.
 */
export type GuardContribution<Guard> =
  Guard extends GuardDescriptor<any, infer Result>
    ? Result extends Response
      ? Record<never, never>
      : Result extends object
        ? Result
        : Record<never, never>
    : Record<never, never>;

/**
 * Ordered intersection of guard enrichments. Later guards never silently
 * shadow earlier ones: re-declaring a key with a different type collapses
 * that property to `never` at compile time (mirroring the runtime collision
 * error), while identical types merge cleanly.
 */
export type MergeGuardOutputs<TGuards extends ReadonlyArray<GuardDescriptor<any, any>>> =
  TGuards extends readonly []
    ? Record<never, never>
    : TGuards extends readonly [infer Head, ...infer Tail]
      ? Head extends GuardDescriptor<any, any>
        ? GuardContribution<Head> &
            MergeGuardOutputs<Tail extends ReadonlyArray<GuardDescriptor<any, any>> ? Tail : readonly []>
        : MergeGuardOutputs<Tail extends ReadonlyArray<GuardDescriptor<any, any>> ? Tail : readonly []>
      : Record<never, never>;

/**
 * Full handler context derived from a route descriptor's configuration.
 * Matches the runtime context assembly field-for-field.
 */
export type RouteContext<
  TServices,
  TParamsSchema = undefined,
  TQuerySchema = undefined,
  THeadersSchema = undefined,
  TBodySchema = undefined,
  TGuards extends ReadonlyArray<GuardDescriptor<any, any>> = readonly [],
> = BaseContext<TServices, SchemaOutputOrRawParams<TParamsSchema>> &
  DeclaredSlot<"query", TQuerySchema> &
  DeclaredSlot<"headers", THeadersSchema> &
  DeclaredSlot<"body", TBodySchema> &
  MergeGuardOutputs<TGuards>;

export type { StandardSchemaOutput };
