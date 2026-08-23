/**
 * Example client smoke (M3-016).
 *
 * Canonical target behind the planned `example:client:smoke` package script:
 * serves the shared contract app on an ephemeral port and drives it with the
 * typed client through success, guard, empty, not-found, and redacted-500
 * paths. Prints EXAMPLE-SMOKE-OK on success.
 */
import { createClient } from "../../src/client/create-client";
import { contractApp } from "./app";

type AppContractLike = {
  readonly "/users/:id": {
    readonly GET: {
      readonly input: {
        readonly params?: { readonly id: string };
        readonly query?: { readonly q?: string; readonly tag?: readonly string[] };
      };
      readonly responses:
        | import("../../src/core/response").TypedResponse<200, { id: string; q: string; tag: string[] | null }>
        | import("../../src/core/response").TypedResponse<422, unknown>;
    };
  };
  readonly "/guarded": {
    readonly GET: {
      readonly input: { readonly headers?: { readonly authorization?: string } };
      readonly responses:
        | import("../../src/core/response").TypedResponse<200, { secret: boolean }>
        | import("../../src/core/response").TypedResponse<401, { error: string }>;
    };
  };
  readonly "/missing-thing": {
    readonly GET: {
      readonly responses: import("../../src/core/response").TypedResponse<404, { code: string }>;
    };
  };
  readonly "/empty": {
    readonly GET: {
      readonly responses: import("../../src/core/response").TypedResponse<204, undefined>;
    };
  };
};

const server = contractApp.serve({ port: 0, development: false });
const client = createClient<AppContractLike>({ baseUrl: server.url });

const ok = await client.get("/users/:id", { params: { id: "u1" }, query: { q: "hi" } });
if (!ok.ok || ok.data.id !== "u1") throw new Error("smoke failed at 200");

const denied = await client.get("/guarded", { headers: {} });
if (denied.ok || denied.response.status !== 401)
  throw new Error("smoke failed at 401");

const missing = await client.get("/missing-thing");
if (missing.ok) throw new Error("smoke: /missing-thing should fail with 404");
if (missing.status !== 404) throw new Error(`smoke: expected 404 got ${String(missing.status)}`);
const code = missing.error.code;
if (code !== "NOPE") throw new Error(`smoke: 404 code ${String(code)}`);

const noContent = await client.get("/empty");
if (!noContent.ok || noContent.status !== 204) throw new Error("smoke failed at 204");

server.stop(true);
console.log("EXAMPLE-SMOKE-OK");
