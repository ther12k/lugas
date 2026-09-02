/**
 * Wire-input vs handler-output split (M6R7).
 *
 * The typed client must demand each schema's wire INPUT (the shape it
 * serializes into the request) while the server handler context keeps
 * receiving the schema's validated OUTPUT. A transforming schema makes the
 * split observable: `z.string().transform((s) => s.length)` sends `string`
 * and handles `number`.
 */
import { z } from "zod";
import type { AppContract } from "../../src/core/contract";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";
import type { ClientCallInput } from "../../src/client/types";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const metrics = defineModule({
  name: "metrics",
  routes: {
    "/metrics": {
      POST: route({
        query: z.object({ n: z.coerce.number() }),
        body: z.object({ raw: z.string().transform((s) => s.length) }),
        handler: () => json(201, { created: true }),
      }),
    },
  },
});

const app = defineApp({ modules: [metrics] });

type Contract = AppContract<typeof app>;

// 1. Client body slot is the schema INPUT: the raw string that goes on the
//    wire, not the transformed number only the server observes.
type PostInput = ClientCallInput<Contract, "/metrics", "POST">;
type _t1 = Expect<Equal<NonNullable<PostInput["body"]>, { raw: string }>>;

// 2. Client query slot is the schema INPUT: coerced numbers take unknown on
//    the wire (any raw string may arrive; the server coerces).
type _t2 = Expect<Equal<NonNullable<PostInput["query"]>, { n: unknown }>>;

// 3. Handler context keeps the OUTPUT: transformed length, coerced number.
const sameShape = route({
  query: z.object({ n: z.coerce.number() }),
  body: z.object({ raw: z.string().transform((s) => s.length) }),
  handler: () => new Response("ok"),
});
type Ctx = Parameters<(typeof sameShape)["handler"]>[0];
type _t3 = Expect<Equal<Ctx["body"], { raw: number }>>;
type _t4 = Expect<Equal<Ctx["query"], { n: number }>>;
