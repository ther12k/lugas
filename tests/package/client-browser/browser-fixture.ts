/**
 * Browser fixture entry (M3-014).
 *
 * Exercises the full typed-client surface the way a browser application
 * would: createClient with an injected standards-compatible fetch stub,
 * path interpolation, query serialization, JSON body, and discriminated
 * result parsing. Server types are imported TYPE-ONLY — this is part of
 * the contract under test.
 *
 * The bundle of this file is executed by `smoke-wrapper.ts` after
 * `globalThis.Bun` has been deleted; any Bun reference throws.
 */
import { createClient } from "../../../src/client/create-client";
import { interpolatePath } from "../../../src/client/path";
import { appendQuery, serializeQuery } from "../../../src/client/query";
import { buildRequestInit } from "../../../src/client/request";
import type { TypedResponse } from "../../../src/core/response";

type FixtureAPI = {
  readonly "/u/:id": {
    readonly GET: {
      readonly input: {
        readonly params?: { readonly id: string };
        readonly query?: { readonly q?: string };
      };
      readonly responses: TypedResponse<200, { ok: boolean }>;
    };
  };
  readonly "/act": {
    readonly POST: {
      readonly input: { readonly body?: { readonly name: string } };
      readonly responses: TypedResponse<201, { done: boolean }>;
    };
  };
};

const calls: string[] = [];

const fetchStub = (async (input: string | URL | Request, init?: RequestInit) => {
  calls.push(`${String(input)}|${init?.method ?? "GET"}`);
  const url = String(input);
  return new Response(JSON.stringify({ ok: url.includes("/u/"), done: url.includes("/act") }), {
    status: url.includes("/act") ? 201 : 200,
    headers: { "content-type": "application/json" },
  });
}) as unknown as typeof fetch;

const client = createClient<FixtureAPI>({ baseUrl: "https://x.test/api", fetch: fetchStub });

const got = await client.get("/u/:id", { params: { id: "a b" }, query: { q: "日本" } });
if (!got.ok) {
  throw new Error(`SMOKE-FAIL GET status ${String(got.status)}`);
}
if (got.data?.ok !== true) {
  throw new Error(`SMOKE-FAIL GET payload ${JSON.stringify(got.data)}`);
}

const posted = await client.post("/act", { body: { name: "Ada" } });
if (!posted.ok || posted.data?.done !== true) {
  throw new Error("SMOKE-FAIL POST");
}

// Pure helpers remain callable in the browser target.
const joined = appendQuery(interpolatePath("/s/:id", { id: "7" }), serializeQuery({ q: "x" }));
if (joined !== "/s/7?q=x") {
  throw new Error(`SMOKE-FAIL helpers ${joined}`);
}
void buildRequestInit; // exported surface compiles into the graph

const expectedGet = "https://x.test/api/u/a%20b?q=%E6%97%A5%E6%9C%AC|GET";
const expectedPost = "https://x.test/api/act|POST";
if (calls[0] !== expectedGet || calls[1] !== expectedPost) {
  throw new Error(`SMOKE-FAIL calls ${JSON.stringify(calls)}`);
}

console.log("CLIENT-SMOKE-OK");
