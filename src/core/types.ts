/**
 * Core public type skeleton (M1-001).
 *
 * Readonly marker/descriptor types for the canonical Lugas declaration
 * syntax selected by the M0-009 spike: stateless factories with an explicit
 * `<Services>` generic escape hatch. These are types only — runtime
 * factories land with M1-004/M1-005/M1-006/M1-007.
 */
import type { Branded } from "../internal/brands";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

/** Minimal Standard-Schema-shaped input placeholder; M2 replaces the payload. */
export type SchemaLike = { readonly "~standard": unknown };

/** A validated-response helper result; helpers land with M1-002/M1-003. */
export type TypedResponse<S extends number = number, B = unknown> = {
  readonly status: S;
  readonly body: B;
} & Response;

/** Guard handler result: enrich context, or short-circuit with a Response. */
export type GuardResult<Enrichment> = Enrichment | Response | Promise<Enrichment | Response>;

export type GuardHandler<TServices, Enrichment> = (context: {
  readonly request: Request;
  readonly services: TServices;
}) => GuardResult<Enrichment>;

export type GuardDescriptor<TServices = unknown, Enrichment = unknown> = Branded<
  {
    readonly name: string;
    readonly handler: GuardHandler<TServices, Enrichment>;
  },
  "GuardDescriptor"
>;

export type RouteHandler<TServices = unknown, TContext = unknown> = (context: {
  readonly request: Request;
  readonly services: TServices;
  readonly params: Record<string, string>;
} & TContext) => Response | TypedResponse | Promise<Response | TypedResponse>;

export type RouteDescriptor<TServices = unknown, TContext = unknown> = Branded<
  {
    readonly handler: RouteHandler<TServices, TContext>;
  },
  "RouteDescriptor"
>;

export type ModuleDescriptor<TServices = unknown> = Branded<
  {
    readonly name: string;
    readonly routes: Readonly<Record<string, unknown>>;
  },
  "ModuleDescriptor"
>;

export type LugasApp<TServices = unknown> = Branded<
  {
    readonly services: TServices;
  },
  "LugasApp"
>;
