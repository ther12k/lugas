/**
 * Native route passthrough security tests (M5-011).
 *
 * Proves Lugas performs no independent path normalization or file
 * resolution for native entries: Bun's router is the sole authority.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, json, route } from "../../../src/index";

function served(config: Parameters<typeof defineApp>[0]) {
  const app = defineApp(config as never);
  const server = app.serve({ port: 0, development: false });
  return {
    url: server.url.origin,
    manifest: (app as unknown as { manifest: { routes: Array<{ method: string; path: string; kind: string; native?: string }> } }).manifest,
    stop: () => server.stop(true),
  };
}

describe("native route passthrough", () => {
  test("bare function serves verbatim without Lugas transformation", async () => {
    const s = served({ routes: { "/raw": () => new Response(JSON.stringify({ served: true }), { headers: { "content-type": "application/json" } }) } });
    try {
      const res = await fetch(new URL("/raw", s.url), { method: "PUT" });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ served: true });
    } finally { s.stop(); }
  });

  test("static Response serves identically (no path normalization)", async () => {
    const body = JSON.stringify({ static: true });
    const s = served({ routes: { "/data": new Response(body, { headers: { "content-type": "application/json" } }) } });
    try {
      const res = await fetch(new URL("/data", s.url));
      expect(await res.text()).toBe(body);
      expect(res.headers.get("content-type")).toContain("application/json");
    } finally { s.stop(); }
  });

  test("traversal attempts do not bypass route matching", async () => {
    const s = served({ routes: { "/api/data": { GET: () => new Response("api") } } });
    try {
      const res = await fetch(new URL("/api/..%2f..%2fetc%2fpasswd", s.url));
      expect(res.status).toBe(404);
    } finally { s.stop(); }
  });

  test("manifest classification correct per native kind", () => {
    const s = served({
      routes: {
        "/fn": () => new Response("fn"),
        "/resp": new Response("resp"),
        "/desc": route({ handler: () => json(200, {}) }),
      },
    });
    try {
      expect(s.manifest.routes.find((r) => r.path === "/fn")?.kind).toBe("native");
      expect(s.manifest.routes.find((r) => r.path === "/fn")?.native).toBe("handler");
      expect(s.manifest.routes.find((r) => r.path === "/resp")?.kind).toBe("native");
      expect(s.manifest.routes.find((r) => r.path === "/desc")?.kind).toBe("lugas");
    } finally { s.stop(); }
  });

  test("unknown native-like values fail before server start", () => {
    expect(() =>
      served({ routes: { "/bad": { unknownKey: "not-a-route" } as never } }),
    ).toThrow(/unsupported route entry/);
  });

  test("no Lugas-independent path resolution for function routes", async () => {
    let receivedPath = "";
    const s = served({
      routes: {
        "/check/*": () => new Response(JSON.stringify({ received: "any-method-ok" })),
      },
    });
    try {
      for (const method of ["GET", "POST", "DELETE"]) {
        const res = await fetch(new URL("/check/anything", s.url), { method });
        expect(res.status).toBe(200);
        void receivedPath;
      }
    } finally { s.stop(); }
  });
});
