/**
 * Rate-limit enrichment typing (M9-008, ADR-0034).
 *
 * `rateLimit()` composes through the ordinary guard pipeline, so the
 * `{ rateLimit: { limit, remaining, resetAt } }` enrichment must flow into
 * handler context typing exactly like a hand-written guard's — and the
 * union-with-Response result must never poison the enrichment (no `never`,
 * no Record<never, never>).
 */
import { defineApp } from "../../src/core/app";
import { rateLimit } from "../../src/core/rate-limit";
import { route } from "../../src/core/route";
import type { RouteContext } from "../../src/internal/context";
import { createMemoryRateLimitStore } from "../../src/core/rate-limit";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const limiter = rateLimit({ limit: 10, windowMs: 60_000, store: createMemoryRateLimitStore() });
type Limiter = typeof limiter;

// 1. The descriptor's enrichment survives the Response union member.
type Contribution = Exclude<Awaited<ReturnType<Limiter["handler"]>>, Response>;
type _t1 = Expect<Equal<Contribution, { rateLimit: { readonly limit: number; readonly remaining: number; readonly resetAt: number } }>>;

// 2. Handler context: rateLimit is a required, fully-typed key on routes
//    that declare the guard.
declare const app: ReturnType<typeof defineApp<{ store: unknown }>>;
type AppRoutes = Parameters<typeof defineApp>[0];

type _t2 = Expect<
  Equal<
    RouteContext<unknown, undefined, undefined, undefined, undefined, readonly [Limiter]>["rateLimit"],
    { readonly limit: number; readonly remaining: number; readonly resetAt: number }
  >
>;

// 3. Composition with an earlier guard: both enrichments intersect, the
//    rate-limit info stays intact alongside the auth contribution.
declare const authGuard: import("../../src/core/types").GuardDescriptor<unknown, { user: { id: string } }>;
type _t3 = Expect<
  Equal<
    RouteContext<unknown, undefined, undefined, undefined, undefined, readonly [typeof authGuard, Limiter]>["rateLimit"],
    { readonly limit: number; readonly remaining: number; readonly resetAt: number }
  >
>;
type _t4 = Expect<
  Equal<
    RouteContext<unknown, undefined, undefined, undefined, undefined, readonly [typeof authGuard, Limiter]>["user"],
    { id: string }
  >
>;

// 4. The key extractor receives the guard context (request, services, and
//    prior enrichments) — a string-returning function typechecks.
rateLimit({
  limit: 5,
  windowMs: 1000,
  store: createMemoryRateLimitStore(),
  key: (ctx) => `${ctx.request.headers.get("x-api-key") ?? "anon"}`,
});

export { app, limiter, type AppRoutes };
