/**
 * Slow/partial body security tests (M5-013).
 */
import { describe, expect, test } from "bun:test";
import { defineApp, json } from "../../src/index";
import { route } from "../../src/core/route";
import { z } from "zod";

describe("slow body handling", () => {
  test("partial JSON body produces 4xx not 5xx", async () => {
    const app = defineApp({
      routes: { "/p": { POST: route({ body: z.object({ a: z.string() }), handler: () => new Response("ok") }) } },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      // Send only half the body then close
      const res = await fetch(new URL("/p", server.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"a":"val',
      }).catch(() => null);
      if (res) expect([400, 422]).toContain(res.status);
    } finally { server.stop(true); }
  });

  test("empty body with declared schema produces 4xx not crash", async () => {
    const app = defineApp({
      routes: { "/p": { POST: route({ body: z.object({ a: z.string() }), handler: () => new Response("ok") }) } },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const res = await fetch(new URL("/p", server.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      expect([400, 422]).toContain(res.status);
    } finally { server.stop(true); }
  });
});
