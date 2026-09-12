/**
 * RF-3 acceptance: framework-generated failures are part of the typed client
 * contract for routes that declare schemas — branchable without casts, absent
 * for routes that declare none, and shaped like the Problem Details documents
 * the runtime actually emits.
 */
import { z } from "zod";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { guard } from "../../src/core/guard";
import { json } from "../../src/core/response";
import type { AppContract } from "../../src/core/contract";
import type { ClientOutcomesFor } from "../../src/client/types";
import type { ValidationProblemFields } from "../../src/internal/validation-problem";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const app = defineApp({
  routes: {
    "/users/:id": {
      PUT: route({
        params: z.object({ id: z.string() }),
        body: z.object({ name: z.string() }),
        handler: (ctx) => json(200, { id: ctx.params.id, name: ctx.body.name }),
      }),
    },
    "/ping": {
      GET: route({ handler: () => json(200, { pong: true }) }),
    },
    "/guarded": {
      GET: route({
        before: [guard({ name: "auth", handler: () => json(401, { error: "no" }) })],
        handler: () => json(200, { ok: true }),
      }),
    },
  },
});
type Contract = AppContract<typeof app>;

// 1. Declared params+body schemas add exactly 400/415/422 to the union.
type UserOutcomes = ClientOutcomesFor<Contract, "/users/:id", "PUT">;
type _userStatuses = Expect<Equal<UserOutcomes["status"], 200 | 400 | 415 | 422>>;

// 2. Each failure branch is the wire Problem Details document, branchable
//    without casts: `code` is the literal failure kind.
type Invalid422 = Extract<UserOutcomes, { status: 422 }>;
type _invalid422Code = Expect<Equal<Invalid422["body"]["code"], "VALIDATION_FAILED">>;
type _invalid422Status = Expect<Equal<Invalid422["body"]["status"], 422>>;
type _media415Code = Expect<Equal<Extract<UserOutcomes, { status: 415 }>["body"]["code"], "UNSUPPORTED_MEDIA_TYPE">>;
type _json400Code = Expect<Equal<Extract<UserOutcomes, { status: 400 }>["body"]["code"], "MALFORMED_JSON">>;
type _issuesShape = Expect<Equal<NonNullable<Invalid422["body"]["issues"]>[number]["message"], string>>;

// 3. The typed problem body is compatible with the runtime construction
//    shape (no drift between the wire type and validation-problem.ts).
const wireProblem: Invalid422["body"] = {
  type: "https://lugasjs.dev/problems/validation",
  title: "Request validation failed",
  status: 422,
  code: "VALIDATION_FAILED",
  issues: [{ message: "invalid", path: ["name"] }],
};
const _runtimeCompatible: ValidationProblemFields = wireProblem;

// 4. Negative: routes with no declared schemas (guard-only included) gain NO
//    framework branches — the union stays handler+guard outcomes.
type PingOutcomes = ClientOutcomesFor<Contract, "/ping", "GET">;
type _pingStatuses = Expect<Equal<PingOutcomes["status"], 200>>;
type GuardedOutcomes = ClientOutcomesFor<Contract, "/guarded", "GET">;
type _guardedStatuses = Expect<Equal<GuardedOutcomes["status"], 200 | 401>>;

void wireProblem;
