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
import { json } from "../../src/core/response";
import type { ProblemFields } from "../../src/core/response";
import type { RouteContext } from "../../src/internal/context";
import { createMemoryRateLimitStore } from "../../src/core/rate-limit";
import type { AppContract } from "../../src/core/contract";
import type { ClientOutcomesFor } from "../../src/client/types";

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

// 5. The 429 short-circuit is a TYPED response (M10-001): the client outcome
//    union carries { status: 429 } precisely — not { status: number } as the
//    pre-M10-001 bare-Response construction degraded it to.
const app429 = defineApp({
  routes: {
    "/limited": {
      GET: route({ before: [limiter], handler: () => json(200, { ok: true }) }),
    },
  },
});
type OutcomeLimited = ClientOutcomesFor<AppContract<typeof app429>, "/limited", "GET">;
type _t5 = Expect<
  Equal<
    Exclude<OutcomeLimited, { status: 200 }>,
    { readonly status: 429; readonly body: string } | { readonly status: 429; readonly body: ProblemFields }
  >
>;

export { app, limiter, app429, type AppRoutes };
