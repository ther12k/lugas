/**
 * Bun-native handler conformance (M4R1-004, issue #198).
 *
 * Probes through the public API against a live server: bare function routes,
 * async functions, plain functions returning Promises, and function values in
 * method-map positions all behave exactly as raw Bun; exotic unsupported
 * shapes still fail closed with stable codes.
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { compileRoute } from "../../src/internal/compile-route";

async function bodyOf(server: Bun.Server<unknown>, path: string): Promise<{ status: number; body: string }> {
  const res = await fetch(`${server.url}${path.replace(/^\//, "")}`);
  return { status: res.status, body: await res.text() };
}

describe("Bun-native handler conformance (M4R1-004)", () => {
  test("bare native function route behaves like raw Bun", async () => {
    const app = defineApp({
      routes: { "/fn": (request: Request) => new Response(`fn:${request.method}`) },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      expect(await bodyOf(server, "/fn")).toEqual({ status: 200, body: "fn:GET" });
    } finally {
      server.stop(true);
    }
  });

  test("plain function returning Promise<Response> succeeds (fast path)", async () => {
    const descriptor = route({
      handler: (): Promise<Response> => Promise.resolve(new Response("promised")),
    }) as never;
    const compiled = compileRoute("GET /promised", descriptor, undefined);
    const out = await compiled.handler(new Request("https://x/promised"));
    expect(out).toBeInstanceOf(Response);
    expect(await out.text()).toBe("promised");
  });

  test("Promise-returning sync function serves through defineApp()", async () => {
    const app = defineApp({
      routes: { "/later": route({ handler: (): Promise<Response> => Promise.resolve(new Response("later")) } as never) },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      expect(await bodyOf(server, "/later")).toEqual({ status: 200, body: "later" });
    } finally {
      server.stop(true);
    }
  });

  test("function values work inside method maps", async () => {
    const app = defineApp({
      routes: {
        "/mapped": {
          GET: (request: Request) => new Response(`get:${request.method}`),
          POST: async (request: Request) => new Response(`post:${request.method}`),
        },
      },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      expect(await bodyOf(server, "/mapped")).toEqual({ status: 200, body: "get:GET" });
      const post = await fetch(`${server.url}mapped`, { method: "POST" });
      expect(await post.text()).toBe("post:POST");
    } finally {
      server.stop(true);
    }
  });

  test("isAsync reports declared async-ness without constructor guessing", () => {
    const syncDeclared = compileRoute("G /a", route({ handler: (): Promise<Response> => Promise.resolve(new Response()) }) as never, undefined);
    // Declared-sync function returning a promise: advisory flag stays false —
    // execution observes the promise at runtime instead.
    expect(syncDeclared.isAsync).toBe(false);

    const asyncDeclared = compileRoute("G /b", route({ handler: async () => new Response() }) as never, undefined);
    expect(asyncDeclared.isAsync).toBe(true);
  });

  test("exotic unsupported values still fail closed", () => {
    expect(() => defineApp({ routes: { "/n": 42 as unknown as Response } })).toThrow(/unsupported route entry/);
    expect(() => defineApp({ routes: { "/m": { GET: true as unknown as Response } } })).toThrow(/unsupported route entry/);
  });

  test("sync handlers stay promise-free on the fast path", () => {
    const descriptor = route({ handler: () => new Response("sync") }) as never;
    const compiled = compileRoute("GET /sync", descriptor, undefined);
    const out = compiled.handler(new Request("https://x/sync"));
    expect(out instanceof Promise).toBe(false);
    expect((out as Response).status).toBe(200);
  });
});
