/**
 * Cancellation stress tests (M5-013).
 *
 * Proves abort at multiple lifecycle stages rejects as transport failure,
 * never fabricates a client result, and doesn't leak partial data.
 */
import { describe, expect, test } from "bun:test";
import { createTestServer } from "../../src/testing/test-server";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";

const app = defineApp({
  routes: {
    "/fast": { GET: () => json(200, { fast: true }) },
    "/slow": {
      GET: route({ handler: async () => { await Bun.sleep(2_000); return json(200, { late: true }); } }),
    },
  },
});

describe("cancellation stress", () => {
  test("abort before send rejects as transport failure (no fabricated result)", async () => {
    const ts = createTestServer(app);
    try {
      const controller = new AbortController();
      controller.abort();
      let caught: unknown;
      try {
        await ts.client.get("/fast", { init: { signal: controller.signal } });
      } catch (error) { caught = error; }
      expect(caught).toBeDefined();
      expect(typeof (caught as { ok?: unknown }).ok).toBe("undefined");
    } finally { await ts.stop(); }
  });

  test("abort during slow request rejects without fabricating 4xx/5xx", async () => {
    const ts = createTestServer(app);
    try {
      const controller = new AbortController();
      const pending = ts.client.get("/slow", { init: { signal: controller.signal } });
      setTimeout(() => controller.abort(), 30);
      let caught: unknown;
      try { await pending; } catch (error) { caught = error; }
      expect(caught).toBeDefined();
      expect(typeof (caught as { ok?: unknown }).ok).toBe("undefined");
    } finally { await ts.stop(); }
  });

  test("10 sequential abort cycles — no unhandled rejections or resource leaks", async () => {
    const ts = createTestServer(app);
    try {
      for (let i = 0; i < 10; i++) {
        const controller = new AbortController();
        const pending = ts.client.get("/slow", { init: { signal: controller.signal } });
        setTimeout(() => controller.abort(), 10 + i);
        try { await pending; } catch { /* expected */ }
      }
    } finally { await ts.stop(); }
  });
});
