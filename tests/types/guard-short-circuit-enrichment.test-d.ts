/**
 * Guard short-circuit + enrichment typing (#328, M6R13).
 *
 * Regression probes for the external-review finding: `GuardContribution`
 * distributed the Response branch into a `Record<never, never>` union member,
 * poisoning handler context for guards that either short-circuit or enrich —
 * the primary authentication pattern. Acceptance items are numbered as in
 * the issue.
 */
import { z } from "zod";
import type { AppContract } from "../../src/core/contract";
import { defineApp } from "../../src/core/app";
import { guard } from "../../src/core/guard";
import { json } from "../../src/core/response";
import { route } from "../../src/core/route";
import type { GuardDescriptor, TypedResponse } from "../../src/core/types";
import type { ClientOutcomesFor } from "../../src/client/types";
import type { GuardContribution, MergeGuardOutputs, RouteContext } from "../../src/internal/context";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// --- Descriptor-level contributions -----------------------------------------

declare const syncUnion: GuardDescriptor<unknown, TypedResponse<401, { error: string }> | { user: { id: string } }>;
declare const asyncUnion: GuardDescriptor<unknown, Promise<TypedResponse<401, { error: string }> | { user: { id: string } }>>;
declare const mixedUnion: GuardDescriptor<unknown, TypedResponse<401, { error: string }> | Promise<{ user: { id: string } }>>;
declare const responseOnly: GuardDescriptor<unknown, TypedResponse<401, { error: string }>>;
declare const rawResponseOnly: GuardDescriptor<unknown, Response>;
declare const emptyEnricher: GuardDescriptor<unknown, Record<never, never>>;
declare const tenantUnion: GuardDescriptor<unknown, TypedResponse<403, { error: string }> | { tenant: { id: number } }>;
declare const keyA: GuardDescriptor<unknown, { key: "a" }>;
declare const keyB: GuardDescriptor<unknown, { key: "b" }>;

// 1. `Response | { user }` contributes exactly the enrichment.
type _t1 = Expect<Equal<GuardContribution<typeof syncUnion>, { user: { id: string } }>>;

// 2. `Promise<Response | { user }>` behaves identically.
type _t2 = Expect<Equal<GuardContribution<typeof asyncUnion>, { user: { id: string } }>>;

// 2b. A guard whose return path is sync-or-promise per branch.
type _t2b = Expect<Equal<GuardContribution<typeof mixedUnion>, { user: { id: string } }>>;

// 3. Response-only guards contribute no context.
type _t3 = Expect<Equal<GuardContribution<typeof responseOnly>, Record<never, never>>>;
type _t3b = Expect<Equal<GuardContribution<typeof rawResponseOnly>, Record<never, never>>>;

// Empty-object enrichment is preserved.
type _t3c = Expect<Equal<GuardContribution<typeof emptyEnricher>, Record<never, never>>>;

// 4. Two ordered guards enrich `user`, then `tenant`.
type MergedTwo = MergeGuardOutputs<[typeof syncUnion, typeof tenantUnion]>;
type _t4 = Expect<Equal<MergedTwo["user"], { id: string }>>;
type _t4b = Expect<Equal<MergedTwo["tenant"], { id: number }>>;

// 5. The first guard's enrichment is visible to the second guard (handler
// context order intersection; guard-handler input reads come through the
// documented unknown index signature).
type _t5 = Expect<
  Equal<
    MergedTwo,
    GuardContribution<typeof syncUnion> & GuardContribution<typeof tenantUnion> & Record<never, never>
  >
>;

// 7. Conflicting enrichment keys stay fail-visible (`never`), not shadowed.
type MergedConflict = MergeGuardOutputs<[typeof keyA, typeof keyB]>;
type _t7 = Expect<Equal<MergedConflict["key"], never>>;

// --- Route-level handler context ---------------------------------------------

const auth = guard({
  name: "auth",
  handler: (ctx) => {
    if (!ctx.request.headers.get("authorization")) {
      return json(401, { error: "unauthorized" });
    }
    return { user: { id: "u_1" } };
  },
});

const tenant = guard({
  name: "tenant",
  handler: () => {
    return { tenant: { id: 7 } };
  },
});

// Second guard sees the first guard's key through the context index
// signature without a cast or `any` (runtime passes prior enrichments).
const roleGate = guard({
  name: "roleGate",
  handler: (ctx) => {
    const prior = ctx["user"];
    return typeof prior === "object" ? { adminVerified: true } : { adminVerified: false };
  },
});

// 8. The README auth flow compiles without `ctx: any`.
const guardedApp = defineApp({
  routes: {
    "/invoices": {
      POST: route({
        before: [auth],
        body: z.object({ amount: z.number().positive(), currency: z.string().length(3) }),
        handler: (ctx) => json(201, { id: "inv_1", amount: ctx.body.amount, user: ctx.user.id }),
      }),
    },
    "/tenant-scope": {
      GET: route({
        before: [auth, tenant],
        handler: (ctx) => json(200, { user: ctx.user, tenant: ctx.tenant }),
      }),
    },
    "/chained": {
      GET: route({
        before: [auth, roleGate],
        handler: (ctx) => json(200, { user: ctx.user, adminVerified: ctx.adminVerified }),
      }),
    },
  },
});

type GuardedCtx = RouteContext<unknown, undefined, undefined, undefined, undefined, [typeof auth]>;
type _t8 = Expect<Equal<GuardedCtx["user"], { id: string }>>;
type GuardedCtxTwo = RouteContext<unknown, undefined, undefined, undefined, undefined, [typeof auth, typeof tenant]>;
type _t8b = Expect<Equal<GuardedCtxTwo["tenant"], { id: number }>>;
type _t8c = Expect<Equal<GuardedCtxTwo["user"], { id: string }>>;

// --- Typed-client visibility (6) ---------------------------------------------

type GuardedContract = AppContract<typeof guardedApp>;
type InvoiceOutcomes = ClientOutcomesFor<GuardedContract, "/invoices", "POST">;
type _t6 = Expect<Equal<InvoiceOutcomes["status"], 201 | 401>>;
type Body401 = Extract<InvoiceOutcomes, { status: 401 }>["body"];
type _t6b = Expect<Equal<Body401, { error: string }>>;
type Body201 = Extract<InvoiceOutcomes, { status: 201 }>["body"];
type _t6c = Expect<Equal<Body201, { id: string; amount: number | null; user: string }>>;

type TenantOutcomes = ClientOutcomesFor<GuardedContract, "/tenant-scope", "GET">;
type _t6d = Expect<Equal<TenantOutcomes["status"], 200 | 401>>;
type _t6e = Expect<Equal<Extract<TenantOutcomes, { status: 200 }>["body"], { user: { id: string }; tenant: { id: number | null } }>>;
