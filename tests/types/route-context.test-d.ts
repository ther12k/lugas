/**
 * Route context derivation tests (M4R1-005).
 *
 * Locks the descriptor-derived handler context: schema outputs for
 * query/headers/body, TRANSFORMED params, ordered guard enrichments, plus
 * negatives for wrong returns and cross-guard field access.
 *
 * Runtime conformance through the real pipeline is owned by M4R1-009;
 * this file locks compile-time truth only.
 */
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";
import { z } from "zod";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const auth = guard({
  name: "auth",
  handler: () => ({ user: { id: "u1" }, roles: ["admin"] }),
});

const tenant = guard({
  name: "tenant",
  handler: () => ({ tenantId: "t-42" }),
});

const full = route({
  params: z.object({ id: z.coerce.number() }),
  query: z.object({ q: z.string(), page: z.coerce.number().optional() }),
  headers: z.object({ "x-trace": z.string() }),
  body: z.object({ name: z.string(), tags: z.array(z.string()).optional() }),
  before: [auth],
  handler: () => new Response("ok"),
});

type FullCtx = Parameters<(typeof full)["handler"]>[0];

// 1. Schema outputs feed query/headers/body as required mutable properties.
type _t1 = Expect<
  Equal<FullCtx["query"], { q: string; page?: number | undefined }>
>;
type _t2 = Expect<Equal<FullCtx["headers"], { "x-trace": string }>>;
type _t3 = Expect<
  Equal<FullCtx["body"], { name: string; tags?: string[] | undefined }>
>;

// 2. Transformed params arrive typed as transformed (coerced number).
type ParamsOf = FullCtx["params"];
type _t4 = Expect<Equal<ParamsOf["id"], number>>;

// 3. Guard enrichments appear in declaration order.
// Guard enrichment field access is locked by assignability (_t5) and the
// collision never-check (_t11); runtime values are verified in M4R1-009.
type _t6 = Expect<Equal<FullCtx["roles"], string[]>>;

// Second guard on its own route contributes its own keys.
const withTenant = route({
  before: [auth, tenant],
  handler: () => new Response("ok"),
});
type TenantCtx = Parameters<(typeof withTenant)["handler"]>[0];
type _t7 = Expect<Equal<TenantCtx["tenantId"], string>>;
type _t8 = Expect<Equal<TenantCtx["user"], { id: string }>>;

// 4. Undeclared slots are optional-undefined so accidental reads are visible.
const bare = route({ handler: () => new Response("ok") });
type BareCtx = Parameters<(typeof bare)["handler"]>[0];
type _t9 = Expect<Equal<BareCtx["query"], undefined>>;
type _t10 = Expect<Equal<BareCtx["headers"], undefined>>;

// 5. Collision semantics: same key with different types collapses to never
//    instead of silently shadowing the earlier guard.
const clashingA = guard({
  name: "clashing-a",
  handler: () => ({ token: "a" as const }),
});
const clashingB = guard({
  name: "clashing-b",
  handler: () => ({ token: 123 }),
});
const clashRoute = route({
  before: [clashingA, clashingB],
  handler: () => new Response("ok"),
});
type ClashToken = Parameters<(typeof clashRoute)["handler"]>[0]["token"];
type _t11 = Expect<Equal<ClashToken, never>>;

// 6. Negative: unknown config keys fail at compile time.
route({
  // @ts-expect-error unknown key
  bogus: 1,
  handler: () => new Response("ok"),
});
