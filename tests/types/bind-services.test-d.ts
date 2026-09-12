/**
 * `bindServices()` acceptance (RF-1, docs/reports/dogfood-realworld-findings.md):
 * one bound route simultaneously infers its services, validated body,
 * transformed params, query, guard enrichments, and literal response
 * statuses — no type arguments, no `as`, no `any`.
 */
import { z } from "zod";
import { bindServices } from "../../src/core/bind-services";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { guard } from "../../src/core/guard";
import { json, problem } from "../../src/core/response";
import type { AppContract } from "../../src/core/contract";
import type { ClientOutcomesFor } from "../../src/client/types";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Db = { query: (sql: string) => Promise<Array<Record<string, unknown>>> };
type JobManager = { enqueue: (name: string) => Promise<void> };
type AppServices = { db: Db; jobs: JobManager };

// Plain guards (services inferred as unknown) must compose with bound routes.
const plainAuth = guard({
  name: "plainAuth",
  handler: () => ({ user: { id: "u_1", role: "admin" as const } }),
});

// 1. The bound factories infer everything per descriptor: services, params
//    (coerced/transformed), query, body, guard enrichment, response statuses.
const bound = bindServices<AppServices>();
const ordersRoute = bound.route({
  params: z.object({ id: z.coerce.number() }),
  query: z.object({ verbose: z.boolean().default(false) }),
  body: z.object({ sku: z.string(), quantity: z.number().int().min(1) }),
  before: [plainAuth],
  handler: (ctx) => {
    type _services = Expect<Equal<typeof ctx.services, AppServices>>;
    type _db = Expect<Equal<typeof ctx.services.db, Db>>;
    type _jobs = Expect<Equal<typeof ctx.services.jobs, JobManager>>;
    // Raw params remain index-addressable alongside the schema output.
    type _params = Expect<Equal<typeof ctx.params, { id: number } & Record<string, unknown>>>;
    type _query = Expect<Equal<typeof ctx.query, { verbose: boolean }>>;
    type _body = Expect<Equal<typeof ctx.body, { sku: string; quantity: number }>>;
    type _user = Expect<Equal<typeof ctx.user, { id: string; role: "admin" }>>;
    void ctx;
    return Math.random() < 0.5
      ? json(201, { orderId: ctx.params.id, sku: ctx.body.sku })
      : problem(409, { title: "Conflict", status: 409 });
  },
});

// 2. The bound guard's handler sees the bound services type.
const boundAuth = bound.guard({
  name: "boundAuth",
  handler: (ctx) => {
    type _services = Expect<Equal<typeof ctx.services, AppServices>>;
    void ctx;
    return { tenant: { id: "t_1" } };
  },
});
const tenantRoute = bound.route({
  before: [boundAuth],
  handler: (ctx) => {
    type _tenant = Expect<Equal<typeof ctx.tenant, { id: string }>>;
    void ctx;
    return json(200, { tenant: ctx.tenant.id });
  },
});

// 3. Contracts still carry literal statuses: handler outcomes + guard
//    short-circuits (plain guards compose; bound guards compose).
const app = defineApp({
  services: { db: { query: async () => [] }, jobs: { enqueue: async () => undefined } },
  routes: {
    "/orders/:id": { POST: ordersRoute },
    "/tenant": { GET: tenantRoute },
  },
});
type Contract = AppContract<typeof app>;
type OrderOutcomes = ClientOutcomesFor<Contract, "/orders/:id", "POST">;
// Declared schemas add the framework's own failure statuses (RF-3).
type _orderStatuses = Expect<Equal<OrderOutcomes["status"], 201 | 409 | 400 | 415 | 422>>;
type Order201 = Extract<OrderOutcomes, { status: 201 }>;
// Jsonify maps NaN/Infinity-capable numbers to `number | null` (wire-honest
// JSON.stringify semantics, M6R11/M6R12) — member-level checks avoid pinning
// Simplify's exact presentation.
type _order201Sku = Expect<Equal<Order201["body"]["sku"], string>>;
type _order201OrderId = Expect<Equal<Order201["body"]["orderId"], number | null>>;

// 4. Module composition: bound routes inside defineModule keep their
//    contracts through MergeModulesRoutes.
const billing = defineModule({
  name: "billing",
  routes: {
    "/billing/summary": {
      GET: bound.route({
        handler: (ctx) => {
          type _services = Expect<Equal<typeof ctx.services, AppServices>>;
          void ctx;
          return json(200, { total: 0 });
        },
      }),
    },
  },
});
const modularApp = defineApp({
  services: { db: { query: async () => [] }, jobs: { enqueue: async () => undefined } },
  modules: [billing],
});
type ModularContract = AppContract<typeof modularApp>;
type _modularOutcomes = ClientOutcomesFor<ModularContract, "/billing/summary", "GET">;
type _modularStatuses = Expect<Equal<ClientOutcomesFor<ModularContract, "/billing/summary", "GET">["status"], 200>>;
