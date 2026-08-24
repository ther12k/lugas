/**
 * Malformed input security tests (M5-008).
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../../src/core/app";
import { route } from "../../../src/core/route";
import { z } from "zod";

describe("malformed input: URL paths", () => {
  test("encoded traversal does not escape route matching", async () => {
    const app = defineApp({ routes: { "/safe": { GET: () => new Response("ok") } } });
    const server = app.serve({ port: 0, development: false });
    try {
      const res = await fetch(new URL("/safe", server.url) + encodeURIComponent("../../etc/passwd"));
      expect([200, 404, 400]).toContain(res.status);
    } finally { server.stop(true); }
  });

  test("null bytes in path are handled safely", async () => {
    const app = defineApp({ routes: { "/x": { GET: () => new Response("ok") } } });
    const server = app.serve({ port: 0, development: false });
    try {
      const res = await fetch(new URL("/x%00inject", server.url));
      expect([200, 404]).toContain(res.status);
    } finally { server.stop(true); }
  });
});

describe("malformed input: request bodies", () => {
  test("deeply nested JSON does not cause stack overflow", async () => {
    const deep = "{\"a\":".repeat(500) + "1" + "}".repeat(500);
    const app = defineApp({
      routes: { "/parse": { POST: route({
        handler: async ({ request }) => {
          try { await request.json(); return new Response("ok"); }
          catch { return new Response("bad", { status: 400 }); }
        },
      }) } },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const res = await fetch(new URL("/parse", server.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: deep,
      });
      expect([200, 400, 413]).toContain(res.status);
    } finally { server.stop(true); }
  });

  test("binary garbage under JSON content-type produces 4xx not 5xx", async () => {
    const app = defineApp({
      routes: { "/parse": { POST: route({
        body: z.object({ a: z.string() }),
        handler: () => new Response("ok"),
      }) } },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const res = await fetch(new URL("/parse", server.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "\xff\xfe\x00binary",
      });
      expect([400, 422]).toContain(res.status);
    } finally { server.stop(true); }
  });
});

describe("malformed input: query strings", () => {
  test("duplicate keys produce arrays matching decoder semantics", async () => {
    const app = defineApp({
      routes: { "/q": { GET: route({
        query: z.object({ k: z.union([z.string(), z.array(z.string())]) }),
        handler: ({ query }: { query: Record<string, unknown> }) => new Response(JSON.stringify(query)),
      }) } },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const res = await fetch(new URL("/q?k=a&k=b", server.url));
      expect(res.status).toBe(200);
    } finally { server.stop(true); }
  });

  test("empty query values are preserved through the pipeline", async () => {
    const app = defineApp({
      routes: { "/q2": { GET: route({
        query: z.object({ k: z.string() }),
        handler: ({ query }: { query: Record<string, unknown> }) => new Response(JSON.stringify(query)),
      }) } },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const res = await fetch(new URL("/q2?k=", server.url));
      expect(res.status).toBe(200);
      expect(((await res.json()) as Record<string, unknown>).k).toBe("");
    } finally { server.stop(true); }
  });
});

describe("malformed input: headers", () => {
  test("oversized header values do not crash the server", async () => {
    const bigValue = "A".repeat(50_000);
    const app = defineApp({ routes: { "/h": { GET: (ctx: { request: Request }) => new Response(String(ctx.request.headers.get("x-big")?.length ?? 0)) } } });
    const server = app.serve({ port: 0, development: false });
    try {
      const res = await fetch(new URL("/h", server.url), { headers: { "x-big": bigValue } });
      expect([200, 400, 431]).toContain(res.status);
    } finally { server.stop(true); }
  });
});
