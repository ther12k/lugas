import { describe, expect, test } from "bun:test";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";
import { compileRoute } from "../../src/internal/compile-route";
import { json, text } from "../../src/core/response";

describe("Guard execution & response short-circuit", () => {
  test("executes guards in exact declaration order", () => {
    const executionOrder: string[] = [];

    const guardA = guard({
      name: "guardA",
      handler: () => {
        executionOrder.push("A");
        return { fromA: true };
      },
    });

    const guardB = guard({
      name: "guardB",
      handler: () => {
        executionOrder.push("B");
        return { fromB: true };
      },
    });

    const descriptor = route({
      before: [guardA, guardB],
      handler: (ctx) => {
        executionOrder.push("handler");
        return json(200, { ok: true, context: ctx });
      },
    });

    const compiled = compileRoute("GET /test", descriptor as never, { db: "mock" });
    const res = compiled.handler(new Request("https://example.com/test"));

    expect(res).toBeInstanceOf(Response);
    expect(executionOrder).toEqual(["A", "B", "handler"]);
  });

  test("guard returning a native Response short-circuits immediately", () => {
    const executed: string[] = [];

    const authGuard = guard({
      name: "authGuard",
      handler: (ctx) => {
        executed.push("auth");
        const token = ctx.request.headers.get("authorization");
        if (!token) {
          return json(401, { error: "unauthorized" });
        }
        return { user: "authenticated" };
      },
    });

    const secondGuard = guard({
      name: "secondGuard",
      handler: () => {
        executed.push("second");
        return { passed: true };
      },
    });

    const descriptor = route({
      before: [authGuard, secondGuard],
      handler: () => {
        executed.push("handler");
        return text(200, "success");
      },
    });

    const compiled = compileRoute("GET /protected", descriptor as never, {});
    const reqWithoutAuth = new Request("https://example.com/protected");
    const response = compiled.handler(reqWithoutAuth) as Response;

    expect(response.status).toBe(401);
    expect(executed).toEqual(["auth"]); // second guard and handler were NOT executed
  });

  test("supports async guards in chain with short-circuiting", async () => {
    const asyncGuard1 = guard({
      name: "asyncGuard1",
      handler: async () => {
        await new Promise((r) => setTimeout(r, 1));
        return { asyncData: "loaded" };
      },
    });

    const asyncGuard2 = guard({
      name: "asyncGuard2",
      handler: async (ctx: any) => {
        if (ctx.asyncData !== "loaded") {
          return json(400, { error: "missing data" });
        }
        return { verified: true };
      },
    });

    const descriptor = route({
      before: [asyncGuard1, asyncGuard2],
      handler: (ctx: any) => json(200, { userCtx: ctx.asyncData, verified: ctx.verified }),
    });

    const compiled = compileRoute("GET /async", descriptor as never, {});
    const resPromise = compiled.handler(new Request("https://example.com/async"));
    expect(resPromise).toBeInstanceOf(Promise);

    const response = await resPromise;
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ userCtx: "loaded", verified: true });
  });

  test("guard throw propagates to caller and does not treat error as continuation", () => {
    const throwingGuard = guard({
      name: "throwingGuard",
      handler: () => {
        throw new Error("guard panic");
      },
    });

    const descriptor = route({
      before: [throwingGuard],
      handler: () => text(200, "should not run"),
    });

    const compiled = compileRoute("GET /panic", descriptor as never, {});
    expect(() => compiled.handler(new Request("https://example.com/panic"))).toThrow("guard panic");
  });
});
