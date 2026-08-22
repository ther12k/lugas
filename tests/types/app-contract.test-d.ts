import { z } from "zod";
import type { AppContract } from "../../src/core/contract";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";
import { guard } from "../../src/core/guard";
import { json, text } from "../../src/core/response";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Guard with 401 response
const authGuard = guard({
  name: "authGuard",
  handler: () => json(401, { error: "unauthorized" }),
});

// 2. Module routes
const userModule = defineModule({
  name: "users",
  routes: {
    "/users/:id": {
      GET: route({
        params: z.object({ id: z.coerce.number() }),
        before: [authGuard],
        handler: (ctx: any) => json(200, { id: ctx.params.id }),
      }),
      POST: route({
        params: z.object({ id: z.coerce.number() }),
        body: z.object({ name: z.string() }),
        handler: (ctx: any) => json(201, { id: ctx.params.id, name: ctx.body.name }),
      }),
    },
  },
});

// 3. Application with root routes + module
const app = defineApp({
  routes: {
    "/health": new Response("OK"),
    "/items": {
      GET: route({
        query: z.object({ page: z.coerce.number() }),
        handler: (ctx: any) => json(200, { items: [], page: ctx.query.page }),
      }),
    },
  },
  modules: [userModule],
});

type Contract = AppContract<typeof app>;

// 1. Verify paths exist in contract
type HasHealth = "/health" extends keyof Contract ? true : false;
type _t1 = Expect<Equal<HasHealth, true>>;

type HasItems = "/items" extends keyof Contract ? true : false;
type _t2 = Expect<Equal<HasItems, true>>;

type HasUsers = "/users/:id" extends keyof Contract ? true : false;
type _t3 = Expect<Equal<HasUsers, true>>;

// 2. Verify methods on /users/:id
type UserMethods = keyof Contract["/users/:id"];
type _t4 = Expect<Equal<UserMethods, "GET" | "POST">>;

// 3. Verify input contract on POST /users/:id
type PostUserInput = Contract["/users/:id"]["POST"]["input"];
type PostUserBody = NonNullable<PostUserInput["body"]>;
type _t5 = Expect<Equal<PostUserBody, { name: string }>>;

// 4. Verify native response route
type HealthKind = Contract["/health"]["GET"]["kind"];
type _t6 = Expect<Equal<HealthKind, "native-response">>;

// 5. Verify type safety: contract is not a runtime property
type HasContractProp = "contract" extends keyof typeof app ? true : false;
type _t7 = Expect<Equal<HasContractProp, false>>;
