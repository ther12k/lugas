import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { createClient } from "../../src/client/create-client";
import type { AppContract } from "../../src/core/contract";
import { defineApp } from "../../src/core/app";
import { json } from "../../src/core/response";
import { route } from "../../src/core/route";

const searchQuery = z.object({
  q: z.string(),
  page: z.coerce.number().int().positive().default(1),
  tag: z.array(z.string()).optional(),
});

const app = defineApp({
  routes: {
    "/search": route({
      query: searchQuery,
      handler: (ctx: { readonly request: Request } & { readonly query?: unknown }) =>
        json(200, ctx.query),
    }),
  },
});

type API = AppContract<typeof app>;

describe("client/server query round-trip", () => {
  test("repeated keys arrive as arrays with coerced scalar types", async () => {
    const server = app.serve({ port: 0, development: false });
    try {
      const client = createClient<API>({ baseUrl: server.url });
      const res = await client.get("/search", {
        query: { q: "lugas", page: 3, tag: ["fast", "bun"] },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ q: "lugas", page: 3, tag: ["fast", "bun"] });
    } finally {
      server.stop(true);
    }
  });

  test("empty string values round-trip without being dropped", async () => {
    const server = app.serve({ port: 0, development: false });
    try {
      const client = createClient<API>({ baseUrl: server.url });
      const res = await client.get("/search", { query: { q: "", page: 1 } });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ q: "", page: 1 });
    } finally {
      server.stop(true);
    }
  });

  test("unicode values round-trip decoded exactly once", async () => {
    const server = app.serve({ port: 0, development: false });
    try {
      const client = createClient<API>({ baseUrl: server.url });
      const res = await client.get("/search", { query: { q: "日本語 クエリ", page: 1 } });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ q: "日本語 クエリ" });
    } finally {
      server.stop(true);
    }
  });

  test("omitted optional keys stay absent on the server contract", async () => {
    const server = app.serve({ port: 0, development: false });
    try {
      const client = createClient<API>({ baseUrl: server.url });
      const res = await client.get("/search", { query: { q: "x", page: 1 } });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toEqual({ q: "x", page: 1 });
      expect("tag" in body).toBeFalse();
    } finally {
      server.stop(true);
    }
  });

  test("params and query compose through path interpolation", async () => {
    const app2 = defineApp({
      routes: {
        "/s/:id": route({
          query: searchQuery,
          handler: (ctx: { readonly request: Request } & { readonly query?: unknown }) =>
        json(200, ctx.query),
        }),
      },
    });
    type API2 = AppContract<typeof app2>;
    const server = app2.serve({ port: 0, development: false });
    try {
      const client = createClient<API2>({ baseUrl: server.url });
      const res = await client.get("/s/:id", {
        params: { id: "usr 1" },
        query: { q: "a b", page: 2 },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ q: "a b", page: 2 });
    } finally {
      server.stop(true);
    }
  });

  test("single-element arrays follow the frozen decoder: they arrive as scalars", async () => {
    // M2-004 semantics: a key occurring once decodes to a plain string.
    // Wire format cannot distinguish [x] from x; documented client limitation.
    const unionApp = defineApp({
      routes: {
        "/search": route({
          query: z.object({
            q: z.string(),
            tag: z.union([z.array(z.string()), z.string()]).optional(),
          }),
          handler: (ctx: { readonly request: Request } & { readonly query?: unknown }) =>
        json(200, ctx.query),
        }),
      },
    });
    type API3 = AppContract<typeof unionApp>;
    const server = unionApp.serve({ port: 0, development: false });
    try {
      const client = createClient<API3>({ baseUrl: server.url });
      const res = await client.get("/search", { query: { q: "one", tag: ["solo"] } });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ q: "one", tag: "solo" });
    } finally {
      server.stop(true);
    }
  });
});
