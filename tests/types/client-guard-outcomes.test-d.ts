import { z } from "zod";
import type { AppContract } from "../../src/core/contract";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { guard } from "../../src/core/guard";
import { json, problem } from "../../src/core/response";
import type { ClientOutcomesFor } from "../../src/client/types";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Auth-style guard chain: 401 (auth) then 403 (admin), handler adds 200/404.
const authGuard = guard({
  name: "authGuard",
  handler: () => json(401, { error: "unauthorized" }),
});
const adminGuard = guard({
  name: "adminGuard",
  handler: () => problem(403, { title: "Forbidden", code: "FORBIDDEN" }),
});

const app = defineApp({
  routes: {
    "/admin/users/:id": {
      GET: route({
        params: z.object({ id: z.coerce.number() }),
        before: [authGuard, adminGuard],
        handler: () => (1 > 0 ? json(200, { id: 1 }) : json(404, { missing: true })),
      }),
    },
    "/plain": {
      GET: route({
        handler: () => json(200, { ok: true }),
      }),
    },
    "/raw-guard": {
      GET: route({
        before: [guard({ name: "raw", handler: () => new Response("nope", { status: 418 }) })],
        handler: () => json(200, { ok: true }),
      }),
    },
  },
});

type Contract = AppContract<typeof app>;

// 1. Guard + handler statuses narrow distinctly in one union
type AdminOutcomes = ClientOutcomesFor<Contract, "/admin/users/:id", "GET">;
type AdminStatuses = AdminOutcomes["status"];
type _t1 = Expect<Equal<AdminStatuses, 200 | 401 | 403 | 404>>;

type Body200 = Extract<AdminOutcomes, { status: 200 }>["body"];
type _t2 = Expect<Equal<Body200, { id: number | null }>>;

// 2. Exact problem extension fields preserved (title + code extension)
type Body403 = Extract<AdminOutcomes, { status: 403 }>["body"];
type _t3 = Expect<Body403 extends { title?: string | undefined; detail?: string | undefined } ? true : false>;
type _t3b = Expect<Equal<"code" extends keyof Body403 ? true : false, true>>;

// 3. Removing guards removes their statuses: /plain has only 200
type PlainOutcomes = ClientOutcomesFor<Contract, "/plain", "GET">;
type _t4 = Expect<Equal<PlainOutcomes, { readonly status: 200; readonly body: { ok: boolean } }>>;

// 4. Raw (unbranded) guard response widens conservatively to number/unknown
type RawGuardOutcomes = ClientOutcomesFor<Contract, "/raw-guard", "GET">;
type RawGuardStatuses = RawGuardOutcomes["status"];
type _t5 = Expect<Equal<RawGuardStatuses, 200 | number>>;
type Body418 = Extract<RawGuardOutcomes, { status: number }>["body"];
type _t6 = Expect<Equal<Body418, unknown>>;
