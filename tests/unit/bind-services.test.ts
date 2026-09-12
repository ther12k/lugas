/**
 * bindServices() runtime behavior (RF-1): the bound factories delegate to
 * route()/guard() — diagnostics, freezing, and the serve path have exactly
 * one implementation.
 */
import { describe, expect, test } from "bun:test";
import { bindServices, defineApp, json } from "../../src/index";
import { createTestServer } from "../../src/testing";

const errCode = (run: () => unknown): string => {
  try {
    run();
    throw new Error("expected throw");
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }
};

describe("bindServices", () => {
  const bound = bindServices<{ db: { find: (id: string) => string } }>();

  test("delegates route() validation diagnostics unchanged", () => {
    expect(errCode(() => bound.route({ handler: () => new Response(null), bogus: 1 } as never))).toBe("LUGAS_ROUTE_002");
    expect(errCode(() => bound.route({ handler: "x" } as never))).toBe("LUGAS_ROUTE_003");
    expect(errCode(() => bound.route({ handler: () => new Response(null), before: [{}] as never }))).toBe("LUGAS_ROUTE_005");
  });

  test("delegates guard() validation diagnostics unchanged", () => {
    expect(errCode(() => bound.guard({ name: "x", handler: () => ({}), bogus: 1 } as never))).toBe("LUGAS_GUARD_002");
    expect(errCode(() => bound.guard({ name: "  ", handler: () => ({}) }))).toBe("LUGAS_GUARD_003");
  });

  test("returns the same frozen descriptor shapes as the plain factories", () => {
    const descriptor = bound.route({ handler: () => new Response(null) });
    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(Object.isFrozen((descriptor as unknown as { before: readonly unknown[] }).before)).toBe(true);
    const g = bound.guard({ name: "g", handler: () => ({ ok: true }) });
    expect(Object.isFrozen(g)).toBe(true);
  });

  test("serves through defineApp with services and guard enrichment end to end", async () => {
    const auth = bound.guard({
      name: "auth",
      handler: () => ({ tenant: { id: "t_1" } }),
    });
    const app = defineApp({
      services: { db: { find: (id: string) => `row:${id}` } },
      routes: {
        "/items/:id": {
          GET: bound.route({
            before: [auth],
            handler: (ctx) => json(200, { row: ctx.services.db.find(ctx.params.id!), tenant: ctx.tenant.id }),
          }),
        },
      },
    });
    const paths = (app.manifest.routes as ReadonlyArray<{ path: string }>).map((r) => r.path);
    expect(paths).toContain("/items/:id");
    const server = createTestServer(app);
    try {
      const res = await server.fetch("/items/42");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ row: "row:42", tenant: "t_1" });
    } finally {
      await server.stop();
    }
  });
});
