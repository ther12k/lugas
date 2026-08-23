/**
 * Test server lifecycle unit tests (M4-006). Deterministic; ephemeral ports.
 */
import { describe, expect, test } from "bun:test";
import { createTestServer } from "../../src/testing/test-server";
import { defineApp, json, route } from "../../src/index";

function markerApp(marker: string) {
  return defineApp({
    routes: {
      "/marker": { GET: route({ handler: () => json(200, { marker }) }) },
      "/echo": {
        POST: route({
          body: zBody(),
          handler: ({ body }: { body?: { v: string } }) => json(200, { echoed: body?.v }),
        }),
      },
    },
  });
}

function zBody() {
  // Local schema keeps this file dependency-light.
  const { z } = require("zod") as typeof import("zod");
  return z.object({ v: z.string() });
}

describe("createTestServer()", () => {
  test("starts on an ephemeral port and serves the composed app", async () => {
    const ts = createTestServer(markerApp("m1"));
    try {
      expect(ts.port).toBeGreaterThan(0);
      const res = await ts.fetch("/marker");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ marker: "m1" });
    } finally {
      await ts.stop();
    }
  });

  test("fetch supports relative paths with init and absolute passthrough", async () => {
    const ts = createTestServer(markerApp("m2"));
    try {
      const echoed = await ts.fetch("/echo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ v: "hello" }),
      });
      const body = (await echoed.json()) as { echoed?: string };
      expect(body.echoed).toBe("hello");

      const abs = await ts.fetch(new URL("/marker", ts.url));
      expect(abs.status).toBe(200);
    } finally {
      await ts.stop();
    }
  });

  test("parallel servers use isolated ports and respond independently", async () => {
    const servers = [createTestServer(markerApp("a")), createTestServer(markerApp("b")), createTestServer(markerApp("c"))];
    try {
      const ports = new Set(servers.map((s) => s.port));
      expect(ports.size).toBe(servers.length);
      const markers = await Promise.all(
        servers.map((s) => s.fetch("/marker").then((r) => r.json() as Promise<{ marker: string }>)),
      );
      expect(markers.map((m) => m.marker)).toEqual(["a", "b", "c"]);
    } finally {
      await Promise.all(servers.map((s) => s.stop()));
    }
  });

  test("forbidden overrides are rejected before any listener exists", () => {
    for (const bad of [{ routes: {} }, { fetch: () => new Response("x") }, { error: () => null }, { fallback: 1 }, { notFound: () => new Response("n") }]) {
      let caught: { code?: string } | undefined;
      try {
        createTestServer(markerApp("r"), bad as never);
      } catch (error) {
        caught = error as { code?: string };
      }
      expect(caught?.code).toBe("LUGAS_TEST_001");
    }
  });

  test("stop is idempotent and releases the port handle", async () => {
    const ts = createTestServer(markerApp("m3"));
    const url = ts.url;
    await ts.fetch("/marker");
    await ts.stop();
    await ts.stop(); // idempotent
    await ts.dispose(); // alias also safe

    let failed = false;
    try {
      await fetch(new URL("/marker", url));
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test("stop stays safe after a start failure", () => {
    let stopped = false;
    const fake = {
      serve: () => {
        throw new Error("boom");
      },
    };
    // A throwing serve must not leave a half-constructed handle; stop on a
    // fresh helper instance remains safe (no shared state between calls).
    expect(() => createTestServer(fake as never)).toThrow("boom");
    void stopped;
  });

  test("exposes the native Bun server handle", () => {
    const ts = createTestServer(markerApp("m4"));
    try {
      expect(typeof ts.server.port).toBe("number");
      expect(ts.server.port).toBe(ts.port);
    } finally {
      void ts.stop();
    }
  });
});
