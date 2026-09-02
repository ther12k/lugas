import { z } from "zod";
import type { AppContract } from "../../src/core/contract";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";
import { guard } from "../../src/core/guard";
import { json } from "../../src/core/response";
import type {
  ClientCallInput,
  PathParams,
  PathsForMethod,
} from "../../src/client/types";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const authGuard = guard({
  name: "authGuard",
  handler: () => json(401, { error: "unauthorized" }),
});

const userModule = defineModule({
  name: "users",
  routes: {
    "/users/:id": {
      GET: route({
        params: z.object({ id: z.coerce.number() }),
        query: z.object({ include: z.string().optional() }),
        before: [authGuard],
        handler: (ctx: any) => json(200, { id: ctx.params.id }),
      }),
      POST: route({
        params: z.object({ id: z.coerce.number() }),
        body: z.object({ name: z.string(), age: z.number() }),
        handler: (ctx: any) => json(201, { id: ctx.params.id }),
      }),
    },
  },
});

const app = defineApp({
  routes: {
    "/health": new Response("OK"),
    "/ping": {
      GET: route({ handler: () => json(200, { ok: true }) }),
    },
  },
  modules: [userModule],
});

type Contract = AppContract<typeof app>;

// 1. PathsForMethod restricts paths by method
type GetPaths = PathsForMethod<Contract, "GET">;
type _t1 = Expect<Equal<GetPaths, "/health" | "/ping" | "/users/:id">>;

type PostPaths = PathsForMethod<Contract, "POST">;
type _t2 = Expect<Equal<PostPaths, "/users/:id">>;

// 2. PathParams extracts :param names
type UsersIdParams = PathParams<"/users/:id">;
type _t3 = Expect<Equal<UsersIdParams, { readonly id: string }>>;

type NoParams = PathParams<"/health">;
type _t4 = Expect<Equal<NoParams, {}>>;

// 3. ClientCallInput merges path params with structured inputs
type GetUserInput = ClientCallInput<Contract, "/users/:id", "GET">;
type _t5 = Expect<Equal<GetUserInput["pathParams"], { readonly id: string }>>;
// z.coerce.number() has input `unknown` (M6R7): the client sends the raw wire
// value; only the server handler context observes the coerced output.
type _t6 = Expect<Equal<NonNullable<GetUserInput["params"]>, { id: unknown }>>;
type _t7 = Expect<Equal<NonNullable<GetUserInput["query"]>, { include?: string | undefined }>>;

// 4. POST body is required structured input
type PostUserInput = ClientCallInput<Contract, "/users/:id", "POST">;
type _t8 = Expect<Equal<NonNullable<PostUserInput["body"]>, { name: string; age: number }>>;
type _t9 = Expect<Equal<PostUserInput["query"], undefined>>;

// 5. Routes without schemas do not expose structured inputs
type PingInput = ClientCallInput<Contract, "/ping", "GET">;
type _t10 = Expect<Equal<PingInput["params"], undefined>>;
type _t11 = Expect<Equal<PingInput["query"], undefined>>;
type _t12 = Expect<Equal<PingInput["body"], undefined>>;

// 6. Invalid method/path pairs resolve to never inputs
type InvalidEntry = ClientCallInput<Contract, "/ping", "POST">;
type _t13 = Expect<Equal<InvalidEntry["body"], never>>;
