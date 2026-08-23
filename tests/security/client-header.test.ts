import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { buildRequestInit } from "../../src/client/request";
import { createClient } from "../../src/client/create-client";
import type { AppContract } from "../../src/core/contract";
import { defineApp } from "../../src/core/app";
import { json } from "../../src/core/response";
import { route } from "../../src/core/route";

const SECRET = "Bearer super-secret-token-value";

function captureMessage(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected throw");
}

describe("client header security", () => {
  test("diagnostics never contain header values", () => {
    const withCrlf = captureMessage(() =>
      buildRequestInit({ method: "POST", headers: { authorization: SECRET + "\r\nX-Steal: 1" } }),
    );
    expect(withCrlf).toContain("'authorization'");
    expect(withCrlf).not.toContain(SECRET);
    expect(withCrlf).not.toContain("super-secret");

    const nonString = captureMessage(() =>
      buildRequestInit({ method: "POST", headers: { cookie: { session: "sid_77" } as never } }),
    );
    expect(nonString).toContain("'cookie'");
    expect(nonString).not.toContain("sid_77");

    const conflict = captureMessage(() =>
      buildRequestInit({
        method: "POST",
        headers: {
          authorization: SECRET,
          "content-type": "text/plain",
        },
        body: { payload: SECRET },
      }),
    );
    expect(conflict).toContain("LUGAS_CLIENT_008");
    expect(conflict).not.toContain(SECRET);
  });

  test("header values cannot inject CRLF into the wire", async () => {
    let receivedHeaders: Headers | undefined;
    const server = Bun.serve({
      port: 0,
      fetch: (req) => {
        receivedHeaders = req.headers;
        return new Response("ok");
      },
    });
    try {
      const client = createClient<{ "/x": { GET: unknown } }>({
        baseUrl: server.url,
        fetch: globalThis.fetch,
      });
      expect(() =>
        client.get("/x", {
          headers: { "x-inject": "a\r\nb: c" } as never,
        }),
      ).toThrow(/line-break/);
      expect(receivedHeaders).toBeUndefined();
    } finally {
      server.stop(true);
    }
  });

  test("declared JSON bodies round-trip through a real server", async () => {
    const echoApp = defineApp({
      routes: {
        "/users/:id": route({
          params: z.object({ id: z.string() }),
          body: z.object({ name: z.string(), tags: z.array(z.string()).optional() }),
          handler: (ctx: { readonly request: Request } & { readonly body?: unknown }) =>
            json(200, ctx.body),
        }),
      },
    });
    type API = AppContract<typeof echoApp>;
    const server = echoApp.serve({ port: 0, development: false });
    try {
      const client = createClient<API>({ baseUrl: server.url });
      const res = await client.post("/users/:id", {
        params: { id: "u1" },
        body: { name: "Ada", tags: ["admin", "dev"] },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ name: "Ada", tags: ["admin", "dev"] });
    } finally {
      server.stop(true);
    }
  });

  test("conflicting content-type fails before dispatch on a live client", async () => {
    let dispatched = false;
    const client = createClient<{ "/send": { POST: unknown } }>({
      baseUrl: "https://x.test",
      fetch: (async () => {
        dispatched = true;
        return new Response("ok");
      }) as unknown as typeof fetch,
    });
    expect(() =>
      client.post("/send", {
        headers: { "content-type": "text/plain" },
        body: { a: 1 },
      } as never),
    ).toThrow(/^LUGAS_CLIENT_008/);
    expect(dispatched).toBeFalse();
  });
});
