import { describe, expect, test } from "bun:test";
import { createClient } from "../../src/client/create-client";
import { defineApp } from "../../src/core/app";
import { json } from "../../src/core/response";
import { route } from "../../src/core/route";
import type { AppContract } from "../../src/core/contract";

const app = defineApp({
  routes: {
    "/ping": {
      GET: route({ handler: () => json(200, { ok: true }) }),
    },
    "/submit": {
      POST: route({ handler: () => json(201, { done: true }) }),
    },
    "/any": route({ handler: () => new Response("any") }),
  },
});

type API = AppContract<typeof app>;

type CapturedCall = { url: string; method?: string | undefined };

function makeRecordingClient() {
  const calls: CapturedCall[] = [];
  const recorder = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method });
    return new Response("ok");
  }) as unknown as typeof fetch;
  const client = createClient<API>({ baseUrl: "https://x.test/api", fetch: recorder });
  return { client, calls };
}

describe("createClient() typed HTTP methods", () => {
  test("each canonical verb dispatches with its exact uppercase method and joined URL", async () => {
    const verbs = [
      ["get", "GET"],
      ["post", "POST"],
      ["put", "PUT"],
      ["patch", "PATCH"],
      ["delete", "DELETE"],
      ["head", "HEAD"],
      ["options", "OPTIONS"],
    ] as const;
    for (const [name, upper] of verbs) {
      const { client, calls } = makeRecordingClient();
      await (client[name] as (path: "/any") => Promise<Response>)("/any");
      expect(calls).toHaveLength(1);
      expect(calls[0]?.method).toBe(upper);
      expect(calls[0]?.url).toBe("https://x.test/api/any");
    }
  });

  test("ALL-contract paths are reachable through every canonical method", async () => {
    const { client, calls } = makeRecordingClient();
    await client.get("/any");
    await client.post("/any");
    await client.put("/any");
    await client.patch("/any");
    await client.delete("/any");
    await client.head("/any");
    await client.options("/any");
    expect(calls.map((c) => c.method)).toEqual([
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ]);
  });

  test("client object has a small enumerable method surface and is frozen", () => {
    const { client } = makeRecordingClient();
    expect(Object.isFrozen(client)).toBe(true);
    expect(Object.keys(client).sort()).toEqual([
      "baseUrl",
      "delete",
      "fetch",
      "get",
      "head",
      "options",
      "patch",
      "post",
      "put",
      "request",
    ]);
    expect(typeof client.get).toBe("function");
    expect(Reflect.get(client, "get")).toBe(client.get);
  });

  test("request escape hatch forwards a supported uppercase verb verbatim", async () => {
    const { client, calls } = makeRecordingClient();
    await client.request("OPTIONS", "/any");
    expect(calls[0]?.method).toBe("OPTIONS");
    expect(calls[0]?.url).toBe("https://x.test/api/any");
  });

  test("request escape hatch rejects unsupported verbs instead of silently dispatching", () => {
    const { client } = makeRecordingClient();
    const looseRequest = client.request as unknown as (method: string, path: string) => Promise<Response>;
    expect(() => looseRequest("get", "/any")).toThrow(/unsupported request method/);
    expect(() => looseRequest("BREW", "/any")).toThrow(/unsupported request method/);
    expect(() => looseRequest("", "/any")).toThrow(/unsupported request method/);
  });

  test("client modules contain no Bun globals or Proxy usage", async () => {
    for (const file of ["src/client/create-client.ts", "src/client/types.ts"]) {
      const source = await Bun.file(file).text();
      expect(source).not.toContain("Bun.");
      expect(source).not.toContain("new Proxy");
    }
  });
});
