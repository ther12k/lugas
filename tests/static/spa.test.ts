/**
 * Opt-in SPA hosting acceptance (ADR-0037): the amended request-ownership
 * table, the policy-capable shell (identical headers at / and deep
 * navigations), HEAD/wrong-method behavior, hashed asset caching, native
 * string files unchanged, and fail-closed ownership validation.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { defineApp, route, json } from "../../src/index";
import { createTestServer } from "../../src/testing";

const DIST = join(import.meta.dir, "fixtures", "spa-dist");
const errCode = (run: () => unknown): string => {
  try {
    run();
    throw new Error("expected throw");
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }
};

// The full composition: API + hashed/static assets + SPA navigations.
const app = defineApp({
  secureHeaders: true,
  routes: {
    "/api/hello": { GET: route({ handler: () => json(200, { hello: true }) }) },
  },
  assets: {
    files: {
      "/assets/app-4f8a1b.js": { path: join(DIST, "assets", "app-4f8a1b.js"), cacheControl: "public, max-age=31536000, immutable" },
      "/robots.txt": join(DIST, "robots.txt"), // string form: unchanged native semantics
    },
  },
  spa: { shell: join(DIST, "index.html"), navigations: ["/", "/app/*"] },
});

describe("ownership table: API routes and API misses", () => {
  const server = createTestServer(app);
  afterAll(() => void server.stop());

  test("existing API route: dispatch unchanged", async () => {
    const res = await server.fetch("/api/hello");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hello: true });
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("missing API-namespace route: API not-found even when the request accepts HTML", async () => {
    const res = await fetch(`${server.url}/api/missing`, { headers: { accept: "text/html" } });
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type") ?? "").not.toContain("text/html");
  });
});

describe("ownership table: assets (hashed object form and native string form)", () => {
  const server = createTestServer(app);
  afterAll(() => void server.stop());

  test("hashed asset mapping: immutable cache header, file contents, pipeline headers", async () => {
    const res = await server.fetch("/assets/app-4f8a1b.js");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("hashed bundle 4f8a1b");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("content-type") ?? "").toContain("javascript");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("string-form file mapping: unchanged native semantics — no cache header, no pipeline headers", async () => {
    const res = await server.fetch("/robots.txt");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("User-agent");
    expect(res.headers.get("cache-control")).toBeNull();
    expect(res.headers.get("x-content-type-options")).toBeNull(); // native value bypasses the pipeline (#403 truth)
  });
});

describe("ownership table: the SPA shell", () => {
  const server = createTestServer(app);
  afterAll(() => void server.stop());

  test("shell at / and a deep navigation: same body, revalidation cache, security headers on both", async () => {
    for (const path of ["/", "/app/projects/42"]) {
      const res = await server.fetch(path, { headers: { accept: "text/html" } });
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('id="root"');
      expect(res.headers.get("cache-control")).toBe("no-cache");
      expect(res.headers.get("content-type") ?? "").toContain("text/html");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("x-frame-options")).toBe("deny");
    }
  });

  test("HEAD on a navigation: shell headers, no body", async () => {
    const res = await server.fetch("/app/projects/42", { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-cache");
    expect(await res.text()).toBe("");
  });

  test("non-navigation methods never receive a successful shell", async () => {
    for (const method of ["POST", "PUT", "DELETE"]) {
      const res = await server.fetch("/app/projects/42", { method });
      expect(res.status).toBe(404);
      expect(await res.text()).not.toContain('id="root"');
    }
  });
});

describe("SPA misses stay distinguishable", () => {
  const app3 = defineApp({
    routes: {},
    assets: { dirs: { "/assets/*": join(DIST, "assets") } },
    spa: { shell: join(DIST, "index.html"), navigations: ["/", "/app/*"] },
  });
  const server = createTestServer(app3);
  afterAll(() => void server.stop());

  test("missing file under an asset-owned prefix: asset 404, never index.html", async () => {
    if (process.platform !== "linux") return; // dirs mounts are Linux-only (ADR-0018 amendment)
    const res = await server.fetch("/assets/missing-4f8a.js", { headers: { accept: "text/html" } });
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain('id="root"');
  });

  test("non-asset, non-navigation path: app not-found, not the shell", async () => {
    const res = await server.fetch("/nothing-here", { headers: { accept: "text/html" } });
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain('id="root"');
  });
});

describe("fail-closed ownership and config validation", () => {
  test("navigation overlapping a route, asset, dir mount, health, openapi, or another navigation: LUGAS_SPA_002", () => {
    const shell = join(DIST, "index.html");
    expect(errCode(() => defineApp({ routes: { "/app": { GET: route({ handler: () => json(200, {}) }) } }, spa: { shell, navigations: ["/app"] } }))).toBe("LUGAS_SPA_002");
    expect(errCode(() => defineApp({ assets: { files: { "/app.js": join(DIST, "robots.txt") } }, spa: { shell, navigations: ["/app.js"] } }))).toBe("LUGAS_SPA_002");
    expect(errCode(() => defineApp({ assets: { dirs: { "/app/*": join(DIST, "assets") } }, spa: { shell, navigations: ["/app/*"] } }))).toBe("LUGAS_SPA_002");
    expect(errCode(() => defineApp({ health: true, spa: { shell, navigations: ["/health"] } }))).toBe("LUGAS_SPA_002");
    expect(errCode(() => defineApp({ openapi: { document: { title: "t", version: "1" } }, spa: { shell, navigations: ["/openapi.json"] } }))).toBe("LUGAS_SPA_002");
    expect(errCode(() => defineApp({ spa: { shell, navigations: ["/app/x", "/app/*"] } }))).toBe("LUGAS_SPA_002"); // exact inside a declared prefix
  });

  test("invalid spa configuration: LUGAS_SPA_001", () => {
    const shell = join(DIST, "index.html");
    expect(errCode(() => defineApp({ spa: { shell: "./nope/index.html", navigations: ["/"] } }))).toBe("LUGAS_SPA_001");
    expect(errCode(() => defineApp({ spa: { shell, navigations: [] } }))).toBe("LUGAS_SPA_001");
    expect(errCode(() => defineApp({ spa: { shell, navigations: ["app/*"] } }))).toBe("LUGAS_SPA_001");
    expect(errCode(() => defineApp({ spa: { shell, navigations: ["/x/**"] } }))).toBe("LUGAS_SPA_001");
    expect(errCode(() => defineApp({ spa: { shell, navigations: ["/:id"] } }))).toBe("LUGAS_SPA_001");
    expect(errCode(() => defineApp({ spa: { shell, navigations: ["/"], bogus: 1 } as never }))).toBe("LUGAS_SPA_001");
  });

  test("navigations are manifest-visible native handler rows", () => {
    const app4 = defineApp({ routes: {}, spa: { shell: join(DIST, "index.html"), navigations: ["/", "/app/*"] } });
    const rows = (app4.manifest.routes as ReadonlyArray<{ path: string; method: string }>).filter((r) => r.path === "/" || r.path === "/app/*");
    expect(rows.some((r) => r.method === "GET" && r.path === "/")).toBe(true);
    expect(rows.some((r) => r.method === "HEAD" && r.path === "/app/*")).toBe(true);
  });
});
