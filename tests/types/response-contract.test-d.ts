import { z } from "zod";
import type { AppContract } from "../../src/core/contract";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { guard } from "../../src/core/guard";
import { empty, json, problem, text } from "../../src/core/response";
import type { ClientOutcome, ClientOutcomes } from "../../src/client/types";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const authGuard = guard({
  name: "authGuard",
  handler: () => problem(401, { title: "Unauthorized" }),
});

const app = defineApp({
  routes: {
    "/items": {
      // Conditional handler returns multiple typed statuses
      GET: route({
        handler: ({ request }) => {
          const filter = new URL(request.url).searchParams.get("filter");
          if (filter === "empty") return empty(204);
          if (filter === "missing") return problem(404, { title: "Not Found" });
          return json(200, { items: ["a"] });
        },
      }),
      // Async handler returning a single typed status
      POST: route({
        body: z.object({ name: z.string() }),
        handler: async () => json(201, { created: true }),
      }),
    },
    "/raw": {
      // Raw unbranded Response handler
      GET: route({
        handler: () => new Response("plain"),
      }),
    },
    "/guarded": {
      GET: route({
        before: [authGuard],
        handler: () => text(200, "ok"),
      }),
    },
  },
});

type Contract = AppContract<typeof app>;

// 1. Conditional handler returns narrow to exact statuses
type GetItems = ClientOutcomes<Contract["/items"]["GET"]>;
type GetItemsStatuses = GetItems["status"];
type _t1 = Expect<Equal<GetItemsStatuses, 200 | 204 | 404>>;

type Status200Body = Extract<GetItems, { status: 200 }>["body"];
type _t2 = Expect<Equal<Status200Body, { items: string[] }>>;

type Status204Body = Extract<GetItems, { status: 204 }>["body"];
type _t3 = Expect<Equal<Status204Body, undefined>>;

// 2. Async handler preserves the same union after Awaited
type PostItems = ClientOutcomes<Contract["/items"]["POST"]>;
type _t4 = Expect<Equal<PostItems, { readonly status: 201; readonly body: { created: boolean } }>>;

// 3. Raw Response widens to number/unknown without becoming any
type RawOutcomes = ClientOutcomes<Contract["/raw"]["GET"]>;
type _t5 = Expect<Equal<RawOutcomes, { readonly status: number; readonly body: unknown }>>;

// 4. Guard responses merge into the outcome union
type GuardedOutcomes = ClientOutcomes<Contract["/guarded"]["GET"]>;
type GuardedStatuses = GuardedOutcomes["status"];
type _t6 = Expect<Equal<GuardedStatuses, 200 | 401>>;

// 5. Direct ClientOutcome usage on a single response
type SingleOutcome = ClientOutcome<import("../../src/core/response").TypedResponse<200, { ok: true }>>;
type _t7 = Expect<Equal<SingleOutcome, { readonly status: 200; readonly body: { ok: true } }>>;
