import { describe, expect, test } from "bun:test";
import { appendQuery, ClientQueryError, serializeQuery } from "../../src/client/query";
import { createClient } from "../../src/client/create-client";

describe("serializeQuery() policy and encoding", () => {
  test("arrays become repeated keys preserving order; never CSV", () => {
    expect(serializeQuery({ tag: ["fast", "bun"] })).toBe("tag=fast&tag=bun");
    expect(serializeQuery({ n: [1, 2] })).toBe("n=1&n=2");
  });

  test("empty strings are preserved; empty arrays omit the key", () => {
    expect(serializeQuery({ q: "" })).toBe("q=");
    expect(serializeQuery({ tag: [] })).toBe("");
    expect(serializeQuery({ q: "", x: "1" })).toBe("q=&x=1");
  });

  test("undefined properties are omitted", () => {
    expect(serializeQuery({ q: undefined, x: "1" })).toBe("x=1");
    expect(serializeQuery(undefined)).toBe("");
  });

  test("documented scalars are stringified once", () => {
    expect(serializeQuery({ page: 3, flag: true, off: false, q: "lugas" })).toBe(
      "page=3&flag=true&off=false&q=lugas",
    );
  });

  test("keys and values are encoded exactly once", () => {
    const out = serializeQuery({ "a b": "c&d=e", uni: "日本語" });
    expect(out).toBe("a+b=c%26d%3De&uni=%E6%97%A5%E6%9C%AC%E8%AA%9E");
    // Round-trip decodes to exactly the original inputs.
    const back = new URLSearchParams(out);
    expect(back.get("a b")).toBe("c&d=e");
    expect(back.get("uni")).toBe("日本語");
  });

  test("policy violations throw LUGAS_CLIENT_006 before fetch", () => {
    const violations = [
      () => serializeQuery({ q: null as never }),
      () => serializeQuery({ tags: [["a"]] as never }),
      () => serializeQuery({ obj: { nested: 1 } as never }),
      () => serializeQuery({ fn: (() => {}) as never }),
      () => serializeQuery({ big: 1n as never }),
      () => serializeQuery({ arr: [null] as never }),
      () => serializeQuery("q=1" as never),
      () => serializeQuery(["a"] as never),
      () => serializeQuery(null as never),
    ];
    for (const violation of violations) {
      try {
        violation();
        throw new Error("expected throw");
      } catch (error) {
        expect(error).toBeInstanceOf(ClientQueryError);
        expect((error as ClientQueryError).code).toBe("LUGAS_CLIENT_006");
      }
    }
  });

  test("appendQuery applies the single preservation rule", () => {
    expect(appendQuery("/search", "")).toBe("/search");
    expect(appendQuery("/search", "q=1")).toBe("/search?q=1");
    expect(appendQuery("/search?x=1", "q=1")).toBe("/search?x=1&q=1");
  });
});

describe("client query dispatch", () => {
  type FakeQuery = { readonly q?: string; readonly page?: number; readonly tag?: readonly string[] };
  type FakeAPI = {
    readonly "/search": {
      readonly GET: { readonly input: { readonly query?: FakeQuery } };
    };
    readonly "/s/:id": {
      readonly GET: {
        readonly input: {
          readonly params?: { readonly id: string };
          readonly query?: FakeQuery;
        };
      };
    };
  };

  function recordingClient() {
    const urls: string[] = [];
    const client = createClient<FakeAPI>({
      baseUrl: "https://x.test/api",
      fetch: (async (input: string | URL | Request, init?: RequestInit) => {
        urls.push(String(input));
        void init;
        return new Response("ok");
      }) as unknown as typeof fetch,
    });
    return { client, urls };
  }

  test("canonical methods append serialized query after the path", async () => {
    const { client, urls } = recordingClient();
    await client.get("/search", { query: { q: "日本", tag: ["a", "b"], page: 2 } });
    expect(urls[0]).toBe("https://x.test/api/search?q=%E6%97%A5%E6%9C%AC&tag=a&tag=b&page=2");
  });

  test("query policy errors prevent dispatch entirely", async () => {
    const { client, urls } = recordingClient();
    expect(() => client.get("/search", { query: { bad: {} } as never })).toThrow(
      /^LUGAS_CLIENT_006/,
    );
    expect(() =>
      client.get("/s/:id", { params: { id: "7" }, query: { bad: null } as never }),
    ).toThrow(/^LUGAS_CLIENT_006/);
    expect(urls).toHaveLength(0);
  });
});
