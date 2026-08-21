/**
 * Core public type skeleton (M1-001, M2-011, M2-012).
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

import type { TypedResponse as _TypedResponse } from "./response";
/** A validated-response helper result; canonical definition lives in `./response`. */
export type TypedResponse<S extends number = number, B = unknown> = _TypedResponse<S, B>;

/** Guard handler result: enrich context, or short-circuit with a Response. */
export type GuardResult<Enrichment> = Enrichment | Response | Promise<Enrichment | Response>;

export type GuardHandler<TServices, Enrichment> = (context: {
  readonly request: Request;
  readonly services: TServices;
  readonly [key: string]: unknown;
}) => GuardResult<Enrichment>;

export type GuardDescriptor<TServices = unknown, Enrichment = unknown> = Branded<
  {
    readonly name: string;
    readonly handler: GuardHandler<TServices, Enrichment>;
  },
  "GuardDescriptor"
>;

export type ExtractGuardEnrichment<TGuard> = TGuard extends GuardDescriptor<any, infer E>
  ? (E extends Response ? {} : (E extends Promise<infer P> ? (P extends Response ? {} : P) : E))
  : {};

export type MergeGuardEnrichments<TGuards extends ReadonlyArray<unknown>> = TGuards extends readonly [
  infer Head,
  ...infer Tail
]
  ? Tail extends readonly []
    ? ExtractGuardEnrichment<Head>
    : ExtractGuardEnrichment<Head> & MergeGuardEnrichments<Tail>
  : TGuards extends ReadonlyArray<infer Item>
  ? ExtractGuardEnrichment<Item>
  : {};

export type ExtractGuardResponse<TGuard> = TGuard extends GuardDescriptor<any, infer E>
  ? (E extends Response
      ? E
      : (E extends Promise<infer P>
          ? (P extends Response ? P : never)
          : never))
  : never;

export type ExtractGuardsResponses<TGuards extends ReadonlyArray<unknown>> = TGuards extends readonly [
  infer Head,
  ...infer Tail
]
  ? Tail extends readonly []
    ? ExtractGuardResponse<Head>
    : ExtractGuardResponse<Head> | ExtractGuardsResponses<Tail>
  : TGuards extends ReadonlyArray<infer Item>
  ? ExtractGuardResponse<Item>
  : never;

export type RouteResponseUnion<
  TRouteHandler,
  TGuards extends ReadonlyArray<unknown> = readonly [],
> =
  | (TRouteHandler extends (...args: any[]) => infer R
      ? (R extends Promise<infer PR> ? PR : R)
      : never)
  | ExtractGuardsResponses<TGuards>;

export type ExtractResponseStatus<TResponse> = TResponse extends TypedResponse<infer S, any>
  ? (number extends S ? number : S)
  : (TResponse extends Response ? number : never);

export type ExtractResponseBody<TResponse, TStatus extends number = number> = TResponse extends TypedResponse<
  infer S,
  infer B
>
  ? (TStatus extends S ? B : (S extends TStatus ? B : never))
  : (TResponse extends Response ? unknown : never);

export type RouteHandler<TServices = unknown, TContext = unknown> = (context: {
  readonly request: Request;
  readonly services: TServices;
  readonly params: Record<string, string>;
} & TContext) => Response | TypedResponse | Promise<Response | TypedResponse>;

export type RouteDescriptor<TServices = unknown, TContext = unknown> = Branded<
  {
    readonly handler: RouteHandler<TServices, TContext>;
    readonly before: ReadonlyArray<GuardDescriptor<TServices, unknown>>;
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
