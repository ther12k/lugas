import type {
  ExtractResponseBody,
  ExtractResponseStatus,
  GuardDescriptor,
  RouteResponseUnion,
  TypedResponse,
} from "../../src/core/types";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Guard 1: 401 Unauthorized
declare const authGuard: GuardDescriptor<unknown, TypedResponse<401, { error: "unauthorized" }>>;

// Guard 2: 403 Forbidden
declare const roleGuard: GuardDescriptor<unknown, TypedResponse<403, { error: "forbidden" }>>;

// Handler: 200 OK | 201 Created
type HandlerFn = () => TypedResponse<200, { id: number; name: string }> | TypedResponse<201, { created: true }>;

// Merged route response union
type RouteResponses = RouteResponseUnion<HandlerFn, [typeof authGuard, typeof roleGuard]>;

// 1. Status extraction across handler + guards
type AllStatuses = ExtractResponseStatus<RouteResponses>;
type _t1 = Expect<Equal<AllStatuses, 200 | 201 | 401 | 403>>;

// 2. Body extraction per status
type Body200 = ExtractResponseBody<RouteResponses, 200>;
type _t2 = Expect<Equal<Body200, { id: number; name: string }>>;

type Body401 = ExtractResponseBody<RouteResponses, 401>;
type _t3 = Expect<Equal<Body401, { error: "unauthorized" }>>;

type Body403 = ExtractResponseBody<RouteResponses, 403>;
type _t4 = Expect<Equal<Body403, { error: "forbidden" }>>;

// 3. Duplicate status forms an explicit union
declare const altAuthGuard: GuardDescriptor<unknown, TypedResponse<401, { code: "TOKEN_EXPIRED" }>>;
type Multi401Responses = RouteResponseUnion<HandlerFn, [typeof authGuard, typeof altAuthGuard]>;
type Merged401Body = ExtractResponseBody<Multi401Responses, 401>;
type _t5 = Expect<Equal<Merged401Body, { error: "unauthorized" } | { code: "TOKEN_EXPIRED" }>>;

// 4. Raw Response safely widens untyped response branch to unknown
declare const rawGuard: GuardDescriptor<unknown, Response>;
type WithRaw = RouteResponseUnion<HandlerFn, [typeof rawGuard]>;
type RawBody = ExtractResponseBody<WithRaw, 200>;
type _t6 = Expect<Equal<RawBody, unknown>>;
