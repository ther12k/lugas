/**
 * Guard response union compile-time regression check (M2-012).
 * Verifies that merging guard response unions scales efficiently across
 * multiple guards without exponential type expansion.
 */
import type {
  ExtractResponseBody,
  ExtractResponseStatus,
  GuardDescriptor,
  RouteResponseUnion,
  TypedResponse,
} from "../../src/core/types";

declare const g401: GuardDescriptor<unknown, TypedResponse<401, { error: string }>>;
declare const g403: GuardDescriptor<unknown, TypedResponse<403, { reason: string }>>;
declare const g429: GuardDescriptor<unknown, TypedResponse<429, { retryAfter: number }>>;
declare const g503: GuardDescriptor<unknown, TypedResponse<503, { maintenance: boolean }>>;

type Handler = () => TypedResponse<200, { ok: true }>;
type FullRouteResponses = RouteResponseUnion<Handler, [typeof g401, typeof g403, typeof g429, typeof g503]>;

type Statuses = ExtractResponseStatus<FullRouteResponses>;
type Body401 = ExtractResponseBody<FullRouteResponses, 401>;
type Body200 = ExtractResponseBody<FullRouteResponses, 200>;

export type CheckStatuses = Statuses extends 200 | 401 | 403 | 429 | 503 ? true : false;
export type CheckBody401 = Body401 extends { error: string } ? true : false;
export type CheckBody200 = Body200 extends { ok: true } ? true : false;
