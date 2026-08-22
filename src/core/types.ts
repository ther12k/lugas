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

export type GuardDescriptor<TServices = unknown, TResult = unknown> = Branded<
  {
    readonly name: string;
    readonly handler: (context: {
      readonly request: Request;
      readonly services: TServices;
      readonly [key: string]: unknown;
    }) => TResult;
  },
  "GuardDescriptor"
>;

export type ExtractGuardEnrichment<TGuard> = TGuard extends GuardDescriptor<any, infer E>
  ? (E extends Response
      ? never
      : (E extends Promise<infer P>
          ? (P extends Response ? never : P)
          : E))
  : never;

export type MergeGuardEnrichments<TGuards extends ReadonlyArray<unknown>> = TGuards extends readonly [
  infer Head,
  ...infer Tail
]
  ? Tail extends readonly []
    ? ([ExtractGuardEnrichment<Head>] extends [never] ? {} : ExtractGuardEnrichment<Head>)
    : ([ExtractGuardEnrichment<Head>] extends [never]
        ? MergeGuardEnrichments<Tail>
        : ExtractGuardEnrichment<Head> & MergeGuardEnrichments<Tail>)
  : TGuards extends ReadonlyArray<infer Item>
  ? ([ExtractGuardEnrichment<Item>] extends [never] ? {} : ExtractGuardEnrichment<Item>)
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
} & TContext) => Response | Promise<Response>;

export type RouteDescriptor<
  TServices = unknown,
  TContext = unknown,
  TParams = unknown,
  TQuery = unknown,
  THeaders = unknown,
  TBody = unknown,
  TReturn = Response | Promise<Response>,
  TGuards extends ReadonlyArray<GuardDescriptor<any, any>> = ReadonlyArray<GuardDescriptor<unknown, unknown>>,
> = Branded<
  {
    readonly handler: (context: {
      readonly request: Request;
      readonly services: TServices;
      readonly params: Record<string, string>;
    } & TContext) => TReturn;
    readonly before: TGuards;
    readonly params?: TParams | undefined;
    readonly query?: TQuery | undefined;
    readonly headers?: THeaders | undefined;
    readonly body?: TBody | undefined;
  },
  "RouteDescriptor"
>;

export type MergeModulesRoutes<TModules extends ReadonlyArray<unknown>> = TModules extends readonly [
  infer Head,
  ...infer Tail
]
  ? (Head extends ModuleDescriptor<any, infer R> ? R : {}) & MergeModulesRoutes<Tail>
  : {};

export type ModuleDescriptor<TServices = unknown, TRoutes = unknown> = Branded<
  {
    readonly name: string;
    readonly routes: TRoutes;
  },
  "ModuleDescriptor"
>;

export type LugasApp<TServices = unknown, TRoutes = unknown> = Branded<
  {
    readonly services: TServices;
    readonly routes?: TRoutes;
  },
  "LugasApp"
>;
