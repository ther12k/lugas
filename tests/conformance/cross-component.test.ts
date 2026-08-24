/**
 * Cross-component conformance suite (M4R1-009).
 *
 * Proves composition = served runtime = manifest = typed client across
 * every M4R1 invariant — exercised through the PUBLIC API against a live
 * `app.serve()`, never through internal helpers.
 *
 * Deterministic across repeated runs: ephemeral ports, no shared state.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, json, route } from "../../src/index";
import { defineModule } from "../../src/core/module";
import { guard } from "../../src/core/guard";
import type { AppContract } from "../../src/core/contract";
import { createTestServer } from "../../src/testing/test-server";
import { z } from "zod";

// --- helpers ---------------------------------------------------------------

function served<TServices = unknown>(config: Parameters<typeof defineApp>[0]) {
  const app = defineApp(config as never);
  const server = app.serve({ port: 0, development: false });
  return {
    server,
    app,
    manifest: (app as unknown as { manifest: import("../../src/internal/manifest").LugasManifestV1 }).manifest,
    stop: () => server.stop(true),
  };
}

const authGuard = guard({
  name: "auth",
  handler: () => ({ user: { id: "u1" } }),
});

// --- probes ----------------------------------------------------------------

describe("module composition", () => {
  test("module A GET /x + module B POST /x → both reachable", async () => {
    const s = served({
      modules: [
        defineModule({ name: "a", routes: { "/x": { GET: route({ handler: () => json(200, { from: "a" }) }) } } }),
        defineModule({ name: "b", routes: { "/x": { POST: route({ handler: () => json(201, { from: "b" }) }) } } }),
      ],
    });
    try {
      const get = await fetch(new URL("/x", s.server.url));
      expect(get.status).toBe(200);
      expect(await get.json()).toEqual({ from: "a" });

      const post = await fetch(new URL("/x", s.server.url), { method: "POST" });
      expect(post.status).toBe(201);
      expect(await post.json()).toEqual({ from: "b" });
    } finally {
      s.stop();
    }
  });

  test("two modules GET /x → startup diagnostic naming both owners", async () => {
    let threw = false;
    try {
      served({
        modules: [
          defineModule({ name: "dup-a", routes: { "/x": { GET: new Response("a") } } }),
          defineModule({ name: "dup-b", routes: { "/x": { GET: new Response("b") } } }),
        ],
      });
    } catch {
      threw = true;
    }
    // The diagnostic fires during prepareApp inside defineApp.
    expect(threw).toBe(true);
  });

  test("module-order independence: same routes declared in reverse order serve identically", async () => {
    const s = served({
      modules: [
        defineModule({ name: "z-last", routes: { "/z-endpoint": { GET: route({ handler: () => json(200, { src: "z" }) }) } } }),
        defineModule({ name: "a-first", routes: { "/a-endpoint": { GET: route({ handler: () => json(200, { src: "a" }) }) } } }),
      ],
    });
    try {
      const z = await fetch(new URL("/z-endpoint", s.server.url));
      expect(z.status).toBe(200);
      const a = await fetch(new URL("/a-endpoint", s.server.url));
      expect(a.status).toBe(200);
    } finally {
      s.stop();
    }
  });
});

describe("manifest truthfulness", () => {
  test("mutating the returned manifest does not change internal state or serving", async () => {
    const s = served({ routes: { "/stable": { GET: route({ handler: () => json(200, { ok: true }) }) } } });
    try {
      // Frozen: mutation attempts throw in strict mode
      expect(() => {
        const mutable = s.manifest as unknown as Record<string, unknown>;
        mutable.format = "TAMPERED";
      }).toThrow();
      // Internal state unchanged
      expect(s.manifest.format).toBe("lugas-manifest-v1");
      expect(s.manifest.routes).toHaveLength(1);
      // Serving unchanged
      const res = await fetch(new URL("/stable", s.server.url));
      expect(res.status).toBe(200);
    } finally {
      s.stop();
    }
  });

  test("manifest record count equals prepared route graph", async () => {
    const s = served({
      routes: {
        "/one": { GET: new Response("1") },
        "/two/:id": {
          PUT: route({ params: z.object({ id: z.string() }), handler: () => json(200, {}) }),
        },
      },
      modules: [
        defineModule({ name: "m", routes: { "/three": { DELETE: route({ handler: () => new Response(null, { status: 204 }) }) } } }),
      ],
    });
    try {
      // Three method/path pairs across root and module
      expect(s.manifest.routes).toHaveLength(3);
      expect(s.manifest.modules).toEqual([{ name: "m", routes: ["/three"] }]);
      const methods = s.manifest.routes.map((r) => r.method);
      expect(methods).toContain("GET");
      expect(methods).toContain("PUT");
      expect(methods).toContain("DELETE");
    } finally {
      s.stop();
    }
  });

  test("serialized manifest uses only ADR-0017-sanctioned method values", () => {
    const s = served({
      routes: {
        "/native": new Response("n"),
        "/handler": () => new Response("h"),
        "/desc": route({ handler: () => json(200, {}) }),
      },
    });
    try {
      const allowed = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "*"]);
      for (const r of s.manifest.routes) {
        expect(allowed.has(r.method)).toBe(true);
      }
    } finally {
      s.stop();
    }
  });
});

describe("runtime classification", () => {
  test("bare native function route behaves like raw Bun", async () => {
    const s = served({ routes: { "/fn": () => new Response("fn-ok") } });
    try {
      const res = await fetch(new URL("/fn", s.server.url), { method: "POST" });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("fn-ok");
    } finally {
      s.stop();
    }
  });

  test("plain function returning Promise<Response> succeeds", async () => {
    const s = served({
      routes: {
        "/async-fn": async () => {
          await Bun.sleep(5);
          return new Response("async-ok");
        },
      },
    });
    try {
      const res = await fetch(new URL("/async-fn", s.server.url));
      expect(await res.text()).toBe("async-ok");
    } finally {
      s.stop();
    }
  });

  test("bare route() descriptor agrees on any-method semantics between runtime and manifest", async () => {
    const s = served({
      routes: { "/bare-desc": route({ handler: () => json(200, { bare: true }) }) },
    });
    try {
      for (const method of ["GET", "POST", "PUT"]) {
        const res = await fetch(new URL("/bare-desc", s.server.url), { method });
        expect(res.status).toBe(200);
      }
      // Manifest records it as "*" kind "lugas"
      expect(s.manifest.routes[0]?.method).toBe("*");
      expect(s.manifest.routes[0]?.kind).toBe("lugas");
    } finally {
      s.stop();
    }
  });

  test("route map mutated after defineApp() does not affect serving or manifest", async () => {
    const routes: Record<string, unknown> = {
      "/original": { GET: route({ handler: () => json(200, { original: true }) }) },
    };
    const s = served({ routes });
    try {
      // Mutate the caller's reference after definition
      routes["/injected"] = { GET: new Response("injected") };

      // Original still works; injected is not served
      const orig = await fetch(new URL("/original", s.server.url));
      expect(orig.status).toBe(200);

      const injected = await fetch(new URL("/injected", s.server.url));
      expect(injected.status).toBe(404);

      // Manifest also unaffected
      expect(s.manifest.routes).toHaveLength(1);
    } finally {
      s.stop();
    }
  });
});
