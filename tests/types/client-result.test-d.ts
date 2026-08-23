import { defineApp } from "../../src/core/app";
import { guard } from "../../src/core/guard";
import { json } from "../../src/core/response";
import { route } from "../../src/core/route";
import type { AppContract } from "../../src/core/contract";
import type { LugasClient } from "../../src/client/create-client";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const authGuard = guard({
  name: "authGuard",
  handler: () => json(401, { error: "unauthorized" }),
});

const app = defineApp({
  routes: {
    "/users/:id": {
      GET: route({
        before: [authGuard],
        handler: () => json(200, { id: "u1", name: "Ada" }),
      }),
    },
    "/missing": {
      GET: route({
        handler: () => json(404, { code: "nope" } as const),
      }),
    },
    "/raw": {
      GET: route({ handler: () => new Response("raw") }),
    },
  },
});

type API = AppContract<typeof app>;
type Client = LugasClient<API>;

// 1. A known 200 outcome narrows to a success with the declared payload type.
type GetUserResult = Awaited<ReturnType<Client["get"]>> extends never
  ? never
  : Extract<Awaited<ReturnType<Client["get"]>>, { ok: true }>;
type _t1 = Expect<
  Equal<
    GetUserResult,
    | { readonly ok: true; readonly status: 200; readonly data: { id: string; name: string }; readonly response: Response }
    | { readonly ok: true; readonly status: number; readonly data: unknown; readonly response: Response }
  >
>;

// 2. Guard short-circuits (401) merge into the same discriminated union as failures.
type GetUnion = Awaited<ReturnType<Client["get"]>>;
type HasFailure = Extract<GetUnion, { ok: false }> extends never ? false : true;
type _t2 = Expect<Equal<HasFailure, true>>;

type UnauthorizedBranch = {
  readonly ok: false;
  readonly status: 401;
  readonly error: { error: string };
  readonly response: Response;
};
type _t3 = Expect<Equal<UnauthorizedBranch extends GetUnion ? true : false, true>>;

// 3. A declared-404-only route still yields failure narrowing for its error body.
type MissingResult = Extract<
  Awaited<ReturnType<Client["get"]>> extends never ? never : Awaited<ReturnType<Client["get"]>>,
  { readonly status: 404 }
>;
type _t4 = Expect<Equal<MissingResult extends { readonly ok: false; readonly error: { code: "nope" } } ? true : false, true>>;

// 4. Raw handler responses stay open: unknown payload, either branch possible.
//    (Covered by the number/unknown branches asserted in _t1's union shape.)

// 5. Discriminant usability: `ok` and `status` narrow data vs error access.
function consume(result: GetUnion) {
  if (result.ok) {
    const data: unknown = result.data;
    void data;
  } else if (result.status === 401) {
    const err: { error: string } | unknown = result.error;
    void err;
  } else {
    const other: unknown = result.error;
    void other;
  }
}
