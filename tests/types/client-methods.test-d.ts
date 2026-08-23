import { defineApp } from "../../src/core/app";
import { json } from "../../src/core/response";
import { route } from "../../src/core/route";
import type { AppContract } from "../../src/core/contract";
import type { HttpMethod } from "../../src/core/types";
import type { LugasClient } from "../../src/client/create-client";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const app = defineApp({
  routes: {
    "/ping": {
      GET: route({ handler: () => json(200, { ok: true }) }),
    },
    "/submit": {
      POST: route({ handler: () => json(201, { done: true }) }),
    },
    "/any": {
      ALL: route({ handler: () => new Response("any") }),
    },
  },
});

type API = AppContract<typeof app>;
type Client = LugasClient<API>;

// 1. Autocomplete/parameter sets offer only paths valid for each method.
type GetPaths = Parameters<Client["get"]>[0];
type _t1 = Expect<Equal<GetPaths, "/ping" | "/any">>;

type PostPaths = Parameters<Client["post"]>[0];
type _t2 = Expect<Equal<PostPaths, "/submit" | "/any">>;

type PutPaths = Parameters<Client["put"]>[0];
type _t3 = Expect<Equal<PutPaths, "/any">>;

type PatchPaths = Parameters<Client["patch"]>[0];
type _t4 = Expect<Equal<PatchPaths, "/any">>;

type DeletePaths = Parameters<Client["delete"]>[0];
type _t5 = Expect<Equal<DeletePaths, "/any">>;

type HeadPaths = Parameters<Client["head"]>[0];
type _t6 = Expect<Equal<HeadPaths, "/any">>;

type OptionsPaths = Parameters<Client["options"]>[0];
type _t7 = Expect<Equal<OptionsPaths, "/any">>;

// 2. Canonical methods resolve to a plain Response promise (parsing lands in M3-011).
type GetResult = Awaited<ReturnType<Client["get"]>>;
type _t8 = Expect<Equal<GetResult, Response>>;

// 3. Escape hatch accepts any supported uppercase verb with any path.
type RequestParams = Parameters<Client["request"]>;
type _t9 = Expect<Equal<RequestParams, [method: HttpMethod, path: string]>>;

// 4. Unsupported method/path pairs are compile errors (negative assertions).
function negatives(client: Client) {
  // @ts-expect-error POST is not declared for /ping
  client.post("/ping");
  // @ts-expect-error /submit does not support GET
  client.get("/submit");
  // @ts-expect-error DELETE only supports ALL paths
  client.delete("/ping");
  // @ts-expect-error unknown paths are rejected
  client.get("/nope");
  // @ts-expect-error lowercase verbs are rejected on the escape hatch
  client.request("get", "/ping");
}
