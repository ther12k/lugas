import { describe, expect, test } from "bun:test";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";
import { compileRoute } from "../../src/internal/compile-route";
import { json, text } from "../../src/core/response";

describe("Multi-guard ordering, collision, and failure semantics", () => {
  test("sync/sync guard chain accumulates context and runs handler", () => {
    const trace: string[] = [];

    const g1 = guard({
      name: "g1",
      handler: () => {
        trace.push("g1");
        return { user: "alice" };
      },
    });

    const g2 = guard({
      name: "g2",
      handler: (ctx: any) => {
        trace.push("g2");
        return { role: `${ctx.user}:admin` };
      },
    });

    const descriptor = route({
      before: [g1, g2],
      handler: (ctx: any) => {
        trace.push("handler");
        return json(200, { user: ctx.user, role: ctx.role });
      },
    });

    const compiled = compileRoute("GET /sync-chain", descriptor as never, {});
    const resp = compiled.handler(new Request("http://localhost/sync-chain")) as Response;

    expect(resp.status).toBe(200);
    expect(trace).toEqual(["g1", "g2", "handler"]);
  });

  test("sync/async and async/sync guard combinations execute in order", async () => {
    const trace: string[] = [];

    const syncG = guard({
      name: "syncG",
      handler: () => {
        trace.push("syncG");
        return { s: 1 };
      },
    });

    const asyncG = guard({
      name: "asyncG",
      handler: async (ctx: any) => {
        trace.push("asyncG");
        await new Promise((r) => setTimeout(r, 1));
        return { a: ctx.s + 1 };
      },
    });

    const descriptor1 = route({
      before: [syncG, asyncG],
      handler: (ctx: any) => {
        trace.push("handler1");
        return json(200, { sum: ctx.s + ctx.a });
      },
    });

    const compiled1 = compileRoute("GET /sync-async", descriptor1 as never, {});
    const respPromise1 = compiled1.handler(new Request("http://localhost/sync-async"));
    expect(respPromise1).toBeInstanceOf(Promise);

    const resp1 = await respPromise1;
    expect(resp1.status).toBe(200);
    expect(trace).toEqual(["syncG", "asyncG", "handler1"]);

    // Test async followed by sync
    trace.length = 0;
    const descriptor2 = route({
      before: [asyncG, syncG],
      handler: () => {
        trace.push("handler2");
        return text(200, "done");
      },
    });

    const compiled2 = compileRoute("GET /async-sync", descriptor2 as never, {});
    const resp2 = await compiled2.handler(new Request("http://localhost/async-sync"));
    expect(resp2.status).toBe(200);
    expect(trace).toEqual(["asyncG", "syncG", "handler2"]);
  });

  test("short-circuit at step 1 stops chain before step 2 or 3", () => {
    const executed: string[] = [];

    const g1 = guard({
      name: "g1",
      handler: () => {
        executed.push("g1");
        return json(401, { error: "unauthorized" });
      },
    });

    const g2 = guard({
      name: "g2",
      handler: () => {
        executed.push("g2");
        return { passed: true };
      },
    });

    const descriptor = route({
      before: [g1, g2],
      handler: () => {
        executed.push("handler");
        return text(200, "ok");
      },
    });

    const compiled = compileRoute("GET /short-1", descriptor as never, {});
    const resp = compiled.handler(new Request("http://localhost/short-1")) as Response;

    expect(resp.status).toBe(401);
    expect(executed).toEqual(["g1"]);
  });

  test("short-circuit at step 2 stops chain before step 3 and handler", async () => {
    const executed: string[] = [];

    const g1 = guard({
      name: "g1",
      handler: () => {
        executed.push("g1");
        return { authenticated: true };
      },
    });

    const g2 = guard({
      name: "g2",
      handler: async () => {
        executed.push("g2");
        await new Promise((r) => setTimeout(r, 1));
        return json(403, { error: "forbidden" });
      },
    });

    const g3 = guard({
      name: "g3",
      handler: () => {
        executed.push("g3");
        return { active: true };
      },
    });

    const descriptor = route({
      before: [g1, g2, g3],
      handler: () => {
        executed.push("handler");
        return text(200, "ok");
      },
    });

    const compiled = compileRoute("GET /short-2", descriptor as never, {});
    const resp = await compiled.handler(new Request("http://localhost/short-2"));

    expect(resp.status).toBe(403);
    expect(executed).toEqual(["g1", "g2"]);
  });

  test("guard throw at step 1 fails closed without running step 2 or handler", () => {
    const executed: string[] = [];

    const g1 = guard({
      name: "g1",
      handler: () => {
        executed.push("g1");
        throw new Error("panic in g1");
      },
    });

    const g2 = guard({
      name: "g2",
      handler: () => {
        executed.push("g2");
        return {};
      },
    });

    const descriptor = route({
      before: [g1, g2],
      handler: () => {
        executed.push("handler");
        return text(200, "ok");
      },
    });

    const compiled = compileRoute("GET /panic-1", descriptor as never, {});
    expect(() => compiled.handler(new Request("http://localhost/panic-1"))).toThrow("panic in g1");
    expect(executed).toEqual(["g1"]);
  });

  test("async guard rejection at step 2 fails closed without running step 3", async () => {
    const executed: string[] = [];

    const g1 = guard({
      name: "g1",
      handler: () => {
        executed.push("g1");
        return { ok: true };
      },
    });

    const g2 = guard({
      name: "g2",
      handler: async () => {
        executed.push("g2");
        throw new Error("async panic in g2");
      },
    });

    const g3 = guard({
      name: "g3",
      handler: () => {
        executed.push("g3");
        return {};
      },
    });

    const descriptor = route({
      before: [g1, g2, g3],
      handler: () => {
        executed.push("handler");
        return text(200, "ok");
      },
    });

    const compiled = compileRoute("GET /panic-async", descriptor as never, {});
    await expect(compiled.handler(new Request("http://localhost/panic-async"))).rejects.toThrow("async panic in g2");
    expect(executed).toEqual(["g1", "g2"]);
  });

  test("guard names and sequence remain ordered and inspectable in descriptor", () => {
    const gAuth = guard({ name: "authGuard", handler: () => ({}) });
    const gRate = guard({ name: "rateLimitGuard", handler: () => ({}) });
    const gRole = guard({ name: "roleGuard", handler: () => ({}) });

    const descriptor = route({
      before: [gAuth, gRate, gRole],
      handler: () => text(200, "ok"),
    });

    expect(descriptor.before.map((g) => g.name)).toEqual(["authGuard", "rateLimitGuard", "roleGuard"]);
  });
});
