/**
 * Typed client ↔ test server integration (M4-007).
 *
 * The documented sequence is one step: `createTestServer(app)` returns a
 * server whose `.client` IS the real lugas/client implementation, typed
 * against the same app instance, with explicit deterministic cleanup.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, json, route } from "../../src/index";
import { createTestServer } from "../../src/testing/test-server";

const app = defineApp({
  routes: {
    "/users/:id": {
      GET: route({
        handler: ({ params }: { params: Record<string, string> }) =>
          json(200, { id: params.id ?? "?", v: "1" }),
      }),
    },
    "/boom": {
      GET: route({
        handler: () => new Response("{}", { status: 500, headers: { "content-type": "application/json" } }),
      }),
    },
    "/slow": {
      GET: route({
        handler: async () => {
          await Bun.sleep(300);
          return json(200, { late: true });
        },
      }),
    },
  },
});

describe("typed client over the test server", () => {
  test("one documented sequence yields a fully typed client", async () => {
    const ts = createTestServer(app);
    try {
      const res = await ts.client.get("/users/:id", { params: { id: "u7" } });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.status).toBe(200);
        expect((res.data as { id?: string }).id).toBe("u7");
      }
    } finally {
      await ts.stop();
    }
  });

  test("HTTP failures arrive as discriminated results, never throws", async () => {
    const ts = createTestServer(app);
    try {
      const boom = await ts.client.get("/boom");
      expect(boom.ok).toBe(false);
      if (!boom.ok) {
        expect(boom.status).toBe(500);
      }
    } finally {
      await ts.stop();
    }
  });

  test("abort semantics are unchanged through the integrated client", async () => {
    const ts = createTestServer(app);
    try {
      const controller = new AbortController();
      const pending = ts.client.get("/slow", { init: { signal: controller.signal } });
      setTimeout(() => controller.abort(), 20);
      let caught: { name?: string } | undefined;
      try {
        await pending;
      } catch (error) {
        caught = error as { name?: string };
      }
      expect(caught?.name).toBe("AbortError");
      expect(typeof (caught as { ok?: unknown }).ok).toBe("undefined");
    } finally {
      await ts.stop();
    }
  });

  test("cleanup stays explicit and deterministic after client use", async () => {
    const ts = createTestServer(app);
    await ts.client.get("/users/:id", { params: { id: "warm" } });
    await ts.stop();
    await ts.stop(); // idempotent
    let reachable = true;
    try {
      await fetch(new URL("/users/x", ts.url));
    } catch {
      reachable = false;
    }
    expect(reachable).toBe(false);
  });

  test("transport failure identity survives the integration", async () => {
    const original = new TypeError("integrated down");
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw original;
    }) as unknown as typeof fetch;
    const ts = createTestServer(app);
    try {
      let caught: unknown;
      try {
        await ts.client.request("GET", "/anything");
      } catch (error) {
        caught = error;
      }
      expect(caught).toBe(original);
      expect(typeof (caught as { ok?: unknown }).ok).toBe("undefined");
    } finally {
      globalThis.fetch = previousFetch;
      await ts.stop();
    }
  });

  test("escape hatch still returns the raw Response", async () => {
    const ts = createTestServer(app);
    try {
      const raw = await ts.client.request("GET", "/users/u9");
      expect(raw instanceof Response).toBe(true);
      const body = (await raw.json()) as { id?: string };
      expect(body.id).toBe("u9");
    } finally {
      await ts.stop();
    }
  });
});
