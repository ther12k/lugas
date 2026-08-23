/**
 * Canonical PreparedApp immutability invariants (M4R1-001, issue #195).
 *
 * Proves that routing structure is captured exactly once inside defineApp():
 * later mutations of caller-owned route maps are invisible to both the served
 * runtime and the manifest, while services remain live references by contract.
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";
import { prepareApp } from "../../src/internal/prepared-app";

const okHandler = (label: string) => route({ handler: () => new Response(label) });

async function bodyOf(url: string): Promise<{ status: number; body: string }> {
  const res = await fetch(url);
  return { status: res.status, body: await res.text() };
}

describe("PreparedApp immutability (M4R1-001)", () => {
  test("route added after defineApp() is invisible to server and manifest", async () => {
    const routes: Record<string, unknown> = { "/early": okHandler("early") };
    const app = defineApp({ routes });
    // NOTE: absolute manifest record counts are owned by M4R1-008 (bare
    // descriptors currently yield zero records). This issue pins snapshot
    // identity, not manifest classification.
    const before = JSON.stringify(app.manifest.routes);

    routes["/late"] = okHandler("late");
    expect(JSON.stringify(app.manifest.routes)).toBe(before);

    const server = app.serve({ port: 0, development: false });
    try {
      expect(await bodyOf(`${server.url}early`)).toEqual({ status: 200, body: "early" });
      // /late must fall through to not-found; the late handler never runs.
      expect(await bodyOf(`${server.url}late`)).toEqual({ status: 404, body: '{"title":"Not Found"}' });
    } finally {
      server.stop(true);
    }
  });

  test("route deleted after defineApp() is still served", async () => {
    const routes: Record<string, unknown> = { "/kept": okHandler("kept") };
    const app = defineApp({ routes });
    delete routes["/kept"];

    const server = app.serve({ port: 0, development: false });
    try {
      expect(await bodyOf(`${server.url}kept`)).toEqual({ status: 200, body: "kept" });
    } finally {
      server.stop(true);
    }
  });

  test("module route map replaced after defineApp() has no effect", async () => {
    const moduleRoutes: Record<string, unknown> = { "/m": okHandler("m1") };
    const users = defineModule({ name: "users", routes: moduleRoutes });
    const app = defineApp({ modules: [users] });
    const before = JSON.stringify(app.manifest.routes);

    moduleRoutes["/injected"] = okHandler("injected");

    const server = app.serve({ port: 0, development: false });
    try {
      expect(await bodyOf(`${server.url}m`)).toEqual({ status: 200, body: "m1" });
      expect((await fetch(`${server.url}injected`)).status).toBe(404);
      expect(JSON.stringify(app.manifest.routes)).toBe(before);
    } finally {
      server.stop(true);
    }
  });

  test("services stay live references after defineApp()", async () => {
    const services = { label: "before" };
    const app = defineApp({
      services,
      routes: {
        "/svc": route({
          handler: ({ services }) => new Response(String((services as { label: string }).label)),
        }),
      },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      expect(await bodyOf(`${server.url}svc`)).toEqual({ status: 200, body: "before" });
      services.label = "after";
      expect(await bodyOf(`${server.url}svc`)).toEqual({ status: 200, body: "after" });
    } finally {
      server.stop(true);
    }
  });

  test("serve() can be called twice from one prepared app", async () => {
    const app = defineApp({ routes: { "/x": okHandler("x") } });
    const a = app.serve({ port: 0, development: false });
    try {
      expect(await bodyOf(`${a.url}x`)).toEqual({ status: 200, body: "x" });
    } finally {
      a.stop(true);
    }
    const b = app.serve({ port: 0, development: false });
    try {
      expect(await bodyOf(`${b.url}x`)).toEqual({ status: 200, body: "x" });
    } finally {
      b.stop(true);
    }
  });

  test("unsupported path-level entry fails at defineApp() with stable code", () => {
    expect(() =>
      defineApp({ routes: { "/bad": 42 as unknown as Response } }),
    ).toThrow(/unsupported route entry at \/bad/);
    try {
      defineApp({ routes: { "/bad": 42 as unknown as Response } });
      throw new Error("unreachable");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("LUGAS_ROUTES_003");
    }
  });

  test("unsupported method-key entry fails at defineApp() with stable code", () => {
    try {
      defineApp({ routes: { "/bad": { GET: 42 as unknown as Response } } });
      throw new Error("unreachable");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("LUGAS_ROUTES_002");
      expect((error as Error).message).toContain("GET /bad");
    }
  });

  test("bare function routes are forwarded verbatim to Bun", async () => {
    const app = defineApp({ routes: { "/fn": (request: Request) => new Response(`fn:${request.method}`) } });
    const server = app.serve({ port: 0, development: false });
    try {
      expect(await bodyOf(`${server.url}fn`)).toEqual({ status: 200, body: "fn:GET" });
    } finally {
      server.stop(true);
    }
  });

  test("prepareApp freezes its own containers but not user-owned values", () => {
    // NOTE: plain functions inside method maps are not yet accepted by the
    // classifier (M4R1-004); native Response values are used here instead.
    const nativeMap = { GET: new Response("native") };
    const response = new Response("static");
    const prepared = prepareApp({
      routes: { "/n": nativeMap, "/s": response },
      services: {},
      onError: undefined,
    });
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(Object.isFrozen(prepared.bunRoutes)).toBe(true);
    expect(Object.isFrozen(prepared.bunRoutes["/n"])).toBe(true);
    // User-owned objects pass through untouched.
    expect(Object.isFrozen(nativeMap)).toBe(false);
    expect(Object.isFrozen(response)).toBe(false);
  });
});
