/**
 * M3-015 adversarial matrix — URL construction (methods, params, queries).
 * Every row asserts the exact request URL and method; no snapshots.
 */
import { describe, expect, test } from "bun:test";
import { recordingClient } from "./fixtures";

const VERB_CASES = [
  { call: "get", path: "/plain", input: undefined, url: "https://matrix.test/api/plain", method: "GET" },
  {
    call: "get",
    path: "/m/:id",
    input: { params: { id: "u&1" }, query: { q: "" } },
    url: "https://matrix.test/api/m/u%261?q=",
    method: "GET",
  },
  {
    call: "post",
    path: "/m/:id",
    input: { params: { id: "7" }, headers: { authorization: "Bearer x" }, body: { name: "Ada" } },
    url: "https://matrix.test/api/m/7",
    method: "POST",
  },
] as const;

describe("matrix: methods × exact requests", () => {
  for (const row of VERB_CASES) {
    test(`${row.call} ${row.path}`, async () => {
      const { client, captured } = recordingClient();
      await (client[row.call] as (p: string, i?: unknown) => Promise<unknown>)(
        row.path,
        row.input,
      );
      expect(captured[0]?.url).toBe(row.url);
      expect(captured[0]?.method).toBe(row.method);
    });
  }
});

describe("matrix: path parameter adversarial cases", () => {
  const cases = [
    { name: "unicode round-trips encoded", id: "日本語", expected: "/m/%E6%97%A5%E6%9C%AC%E8%AA%9E" },
    { name: "reserved slash cannot add segments", id: "a/b", expected: "/m/a%2Fb" },
    { name: "query injection is neutralized", id: "?x=1", expected: "/m/%3Fx%3D1" },
    { name: "fragment injection is neutralized", id: "#f", expected: "/m/%23f" },
    { name: "percent stays single-encoded", id: "%2F", expected: "/m/%252F" },
    { name: "space becomes plus-free %20", id: "a b", expected: "/m/a%20b" },
    { name: "dot segments stay literal client-side", id: "..", expected: "/m/.." },
  ] as const;

  for (const row of cases) {
    test(row.name, async () => {
      const { client, captured } = recordingClient();
      await client.get("/m/:id", { params: { id: row.id }, query: {} });
      expect(captured[0]?.url).toBe(`https://matrix.test/api${row.expected}`);
    });
  }

  const failures = [
    { name: "missing param throws LUGAS_CLIENT_001 before fetch", run: (c: ReturnType<typeof recordingClient>["client"]) => c.get("/m/:id") as never, code: /^LUGAS_CLIENT_001/ },
    {
      name: "undefined param value throws LUGAS_CLIENT_001",
      run: (c: ReturnType<typeof recordingClient>["client"]) => c.get("/m/:id", { params: { id: undefined }, query: {} } as never),
      code: /^LUGAS_CLIENT_001/,
    },
    {
      name: "extra param throws LUGAS_CLIENT_002",
      run: (c: ReturnType<typeof recordingClient>["client"]) => c.get("/m/:id", { params: { id: "1", extra: "2" }, query: {} } as never),
      code: /^LUGAS_CLIENT_002/,
    },
    {
      name: "object param value throws LUGAS_CLIENT_003",
      run: (c: ReturnType<typeof recordingClient>["client"]) => c.get("/m/:id", { params: { id: {} }, query: {} } as never),
      code: /^LUGAS_CLIENT_003/,
    },
  ] as const;

  for (const row of failures) {
    test(row.name, async () => {
      const { client, captured } = recordingClient();
      expect(() => row.run(client)).toThrow(row.code);
      expect(captured).toHaveLength(0);
    });
  }
});

describe("matrix: query serialization adversarial cases", () => {
  const cases = [
    { name: "repeated keys preserve order", query: { tag: ["b", "a"] }, qs: "tag=b&tag=a" },
    { name: "empty string preserved", query: { q: "" }, qs: "q=" },
    { name: "undefined omitted", query: { q: undefined, tag: ["x"] } as never, qs: "tag=x" },
    { name: "scalars stringified once", query: { q: 3 }, qs: "q=3" },
    { name: "unicode and spaces encoded once", query: { q: "日本 x&y=z" }, qs: "q=%E6%97%A5%E6%9C%AC+x%26y%3Dz" },
  ] as const;

  for (const row of cases) {
    test(row.name, async () => {
      const { client, captured } = recordingClient();
      await client.get("/m/:id", { params: { id: "s" }, query: row.query } as never);
      expect(captured[0]?.url).toBe(`https://matrix.test/api/m/s?${row.qs}`);
    });
  }

  test("object query values throw LUGAS_CLIENT_006 before fetch", () => {
    const { client, captured } = recordingClient();
    expect(() => client.get("/m/:id", { params: { id: "s" }, query: { q: {} } as never })).toThrow(
      /^LUGAS_CLIENT_006/,
    );
    expect(captured).toHaveLength(0);
  });
});
