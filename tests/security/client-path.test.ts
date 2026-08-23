import { describe, expect, test } from "bun:test";
import { interpolatePath } from "../../src/client/path";
import { createClient } from "../../src/client/create-client";

describe("client path security", () => {
  test("reserved characters cannot inject extra path segments, query, or fragment", () => {
    const attacks = [
      "../admin",
      "a/b/c",
      "?next=/admin",
      "#/steal",
      "%2e%2e%2fadmin",
      "id?x=1#y",
    ];
    for (const attack of attacks) {
      const built = interpolatePath("/users/:id", { id: attack });
      const match = built.match(/^\/users\/([^/?#]*)$/);
      expect(match).not.toBeNull();
      expect(match![1]!.includes("/")).toBeFalse();
    }
  });

  test("wildcard encoding preserves multi-segment intent without escapes", () => {
    expect(interpolatePath("/files/*", { "*": "../etc/passwd" })).toBe("/files/../etc/passwd");
    expect(interpolatePath("/files/*", { "*": "a?x/b#y" })).toBe("/files/a%3Fx/b%23y");
    const built = interpolatePath("/files/*", { "*": ["ok", "?q"] });
    expect(built).toBe("/files/ok/%3Fq");
  });

  test("unicode round-trips through a real Bun server param", async () => {
    let captured: string | undefined;
    const server = Bun.serve({
      port: 0,
      routes: {
        "/u/:name": (req) => {
          const params = (req as unknown as { params: Record<string, string> }).params;
          captured = params?.name;
          return new Response("ok");
        },
      },
    });
    try {
      const client = createClient<{ "/u/:name": { GET: unknown } }>({
        baseUrl: server.url,
        fetch: globalThis.fetch,
      });
      await client.get("/u/:name", { params: { name: "日本語-名前" } });
      expect(captured).toBe("日本語-名前");
    } finally {
      await server.stop(true);
    }
  });

  test("encoded slash stays within one matched segment on a real Bun server", async () => {
    let segmentCount = -1;
    let decodedValue: string | undefined;
    const server = Bun.serve({
      port: 0,
      routes: {
        "/u/:name": (req) => {
          const params = (req as unknown as { params: Record<string, string> }).params;
          decodedValue = params?.name;
          segmentCount = new URL(req.url).pathname.split("/").filter(Boolean).length;
          return new Response("ok");
        },
        "/u/a/b": () => new Response("WRONG-ROUTE"),
      },
    });
    try {
      const client = createClient<{ "/u/:name": { GET: unknown } }>({
        baseUrl: server.url,
        fetch: globalThis.fetch,
      });
      await client.get("/u/:name", { params: { name: "a/b" } });
      expect(segmentCount).toBe(2);
      expect(decodedValue).toBe("a/b");
    } finally {
      await server.stop(true);
    }
  });

  test("errors are raised before any fetch dispatch", () => {
    let dispatched = false;
    const client = createClient<{ "/users/:id": { GET: unknown } }>({
      baseUrl: "https://x.test",
      fetch: (async () => {
        dispatched = true;
        return new Response("ok");
      }) as unknown as typeof fetch,
    });
    expect(() => client.get("/users/:id", {} as never)).toThrow(/^LUGAS_CLIENT_001/);
    expect(dispatched).toBeFalse();
  });
});
