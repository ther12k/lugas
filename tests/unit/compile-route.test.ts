import { describe, expect, test } from "bun:test";
import { compileRoute } from "../../src/internal/compile-route";
import { route } from "../../src/core/route";

describe("compileRoute()", () => {
  test("sync handler stays synchronous (isAsync false, no promise)", () => {
    const descriptor = route({ handler: () => new Response("sync") }) as never;
    const compiled = compileRoute("GET /sync", descriptor, undefined);
    expect(compiled.isAsync).toBe(false);
    const out = compiled.handler(new Request("http://x/sync"));
    expect(out).toBeInstanceOf(Response);
    expect(out instanceof Promise).toBe(false);
  });

  test("async handler is preserved", async () => {
    const descriptor = route({ handler: async () => new Response("async") }) as never;
    const compiled = compileRoute("GET /async", descriptor, undefined);
    expect(compiled.isAsync).toBe(true);
    const out = await compiled.handler(new Request("http://x/async"));
    expect(await out.text()).toBe("async");
  });

  test("base context carries request, services, and params", async () => {
    const descriptor = route({
      handler: (ctx) => Response.json({ has: [typeof ctx.request, ctx.services, Object.keys(ctx.params).length] }),
    }) as never;
    const compiled = compileRoute("GET /ctx", descriptor, { db: 1 });
    const res = await compiled.handler(new Request("http://x/ctx"));
    expect(await res.json()).toEqual({ has: ["object", { db: 1 }, 0] });
  });

  test("non-Response return is rejected with route identity", async () => {
    const descriptor = route({ handler: (() => "nope") as never }) as never;
    const compiled = compileRoute("GET /bad", descriptor, undefined);
    expect(() => compiled.handler(new Request("http://x/bad"))).toThrow(/GET \/bad/);
  });
});
