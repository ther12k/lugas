import type {
  ExtractResponseBody,
  ExtractResponseStatus,
  GuardDescriptor,
  MergeGuardEnrichments,
  RouteDescriptor,
  RouteResponseUnion,
  TypedResponse,
} from "../../../src/core/types";
import type { StandardSchema } from "../../../src/internal/standard-schema";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Schema Input & Output Types
declare const paramsSchema: StandardSchema<Record<string, string>, { id: number }>;
declare const querySchema: StandardSchema<Record<string, unknown>, { page: number; filter?: string }>;
declare const headersSchema: StandardSchema<Record<string, string>, { "x-api-key": string }>;
declare const bodySchema: StandardSchema<{ name: string }, { name: string; slug: string }>;

// 2. Guard Enrichments & Short-Circuit Responses
declare const authGuard: GuardDescriptor<
  unknown,
  { user: { id: string; role: "admin" | "user" } } | TypedResponse<401, { error: "unauthorized" }>
>;

declare const tenantGuard: GuardDescriptor<
  unknown,
  { tenant: { id: number; plan: string } } | TypedResponse<403, { error: "forbidden" }>
>;

// 3. Merged Guard Context
type MergedEnrichment = MergeGuardEnrichments<[typeof authGuard, typeof tenantGuard]>;
type _checkEnrichment = Expect<
  Equal<
    MergedEnrichment,
    { user: { id: string; role: "admin" | "user" } } & { tenant: { id: number; plan: string } }
  >
>;

// 4. Merged Response Union across Handler and Guards
type HandlerReturns = () => TypedResponse<200, { success: true; user: string }> | TypedResponse<201, { created: true }>;
type AllResponses = RouteResponseUnion<HandlerReturns, [typeof authGuard, typeof tenantGuard]>;

type StatusUnion = ExtractResponseStatus<AllResponses>;
type _checkStatuses = Expect<Equal<StatusUnion, 200 | 201 | 401 | 403>>;

type Body401 = ExtractResponseBody<AllResponses, 401>;
type _check401 = Expect<Equal<Body401, { error: "unauthorized" }>>;

type Body403 = ExtractResponseBody<AllResponses, 403>;
type _check403 = Expect<Equal<Body403, { error: "forbidden" }>>;

type Body200 = ExtractResponseBody<AllResponses, 200>;
type _check200 = Expect<Equal<Body200, { success: true; user: string }>>;

// 5. Negative Type Rejections (@ts-expect-error assertions)

// @ts-expect-error: Invalid status 404 should not match any 200/201/401/403 body
type NonExistentBody = Expect<Equal<ExtractResponseBody<AllResponses, 404>, { missing: true }>>;

// @ts-expect-error: Cannot forge branded RouteDescriptor without going through route() factory
const forgedRoute: RouteDescriptor = { handler: () => new Response(), before: [] };
