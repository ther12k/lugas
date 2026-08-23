/**
 * Type-level assertions for the test-server client integration (M4-007):
 * the exposed client must be exactly `LugasClient<AppContract<typeof app>>`.
 */
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import type { AppContract } from "../../src/core/contract";
import type { TypedResponse } from "../../src/core/response";
import { createTestServer } from "../../src/testing/test-server";
import type { LugasClient } from "../../src/client/create-client";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const app = defineApp({
  routes: {
    "/users/:id": {
      GET: {
        responses: [undefined as unknown as TypedResponse<200, { id: string }>],
      },
    },
    "/missing": {
      GET: {
        responses: [undefined as unknown as TypedResponse<404, { code: "NOPE" }>],
      },
    },
  },
});

// Inferred (non-annotated) call: generics flow from the app instance.
const serverForApp = createTestServer(app);

// 1. The server exposes exactly the contract-typed client.
type ExposedClient = typeof serverForApp.client;
type _t1 = Expect<Equal<ExposedClient, LugasClient<AppContract<typeof app>>>>;

// 2. Path restrictions survive the integration untouched.
type _t2 = Expect<
  Equal<Parameters<(typeof serverForApp)["client"]["get"]>[0], "/users/:id" | "/missing">
>;

// 3. Negative: unknown paths remain compile errors through the integrated client.
function negative(client: LugasClient<AppContract<typeof app>>) {
  // @ts-expect-error undeclared path
  client.get("/nope");
}
void negative;
