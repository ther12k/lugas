import type {
  ExtractResponseBody,
  ExtractResponseStatus,
  GuardDescriptor,
  MergeGuardEnrichments,
  RouteResponseUnion,
  TypedResponse,
} from "../../src/core/types";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Tier 1: Auth Guard -> enriches { user: { id: string } } | 401
declare const authGuard: GuardDescriptor<unknown, { user: { id: string } } | TypedResponse<401, { error: "unauthorized" }>>;

// Tier 2: Role Guard -> enriches { role: "admin" | "member" } | 403
declare const roleGuard: GuardDescriptor<unknown, { role: "admin" | "member" } | TypedResponse<403, { error: "forbidden" }>>;

// Tier 3: Rate limit Guard -> returns 429
declare const rateLimitGuard: GuardDescriptor<unknown, TypedResponse<429, { retryAfter: number }>>;

// Merged enrichment type
type Enrichments = MergeGuardEnrichments<[typeof authGuard, typeof roleGuard, typeof rateLimitGuard]>;
type _t1 = Expect<Equal<Enrichments, { user: { id: string } } & { role: "admin" | "member" }>>;

// Merged response union
type HandlerFn = () => TypedResponse<200, { data: string }>;
type FullResponses = RouteResponseUnion<HandlerFn, [typeof authGuard, typeof roleGuard, typeof rateLimitGuard]>;

type AllStatuses = ExtractResponseStatus<FullResponses>;
type _t2 = Expect<Equal<AllStatuses, 200 | 401 | 403 | 429>>;

type Body429 = ExtractResponseBody<FullResponses, 429>;
type _t3 = Expect<Equal<Body429, { retryAfter: number }>>;
