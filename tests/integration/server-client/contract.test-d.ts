/**
 * Compile-time contract assertions over the SAME application definition used
 * by the runtime integration tests (M3-016 acceptance: shared definition).
 */
import type { AppContract } from "../../../src/core/contract";
import { contractApp } from "../../../examples/client/app";
import type { LugasClient } from "../../../src/client/create-client";
import type { ClientCallResult } from "../../../src/client/types";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type API = AppContract<typeof contractApp>;
type Client = LugasClient<API>;

// 1. /users/:id GET narrows to exactly its declared success payload.
type UsersGet = ClientCallResult<API, "/users/:id", "GET">;
type _t1 = Expect<
  Equal<
    UsersGet,
    {
      readonly ok: true;
      readonly status: 200;
      readonly data: { id: string; q: string; tag: string[] | null };
      readonly response: Response;
    }
  >
>;

// 2. Guard statuses merge into /guarded's union as failures.
type GuardedGet = ClientCallResult<API, "/guarded", "GET">;
type GuardedFailure = Extract<GuardedGet, { readonly ok: false }>;
type _t2 = Expect<
  Equal<
    GuardedFailure,
    {
      readonly ok: false;
      readonly status: 401;
      readonly error: { error: string };
      readonly response: Response;
    }
  >
>;

// 3. Omitting input for a param-declared path compiles (input optional) but
//    fails at runtime with LUGAS_CLIENT_001 — compile-time facts and runtime
//    facts stay distinct by architecture.
function usage(client: Client) {
  void client.get("/users/:id");
}
