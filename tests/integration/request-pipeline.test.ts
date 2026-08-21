import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";
import { compileRoute } from "../../src/internal/compile-route";
import { json, text } from "../../src/core/response";

describe("Request validation and guard pipeline composition", () => {
  test("runs complete pipeline in order: headers -> params -> query -> body -> guards -> handler", async () => {
    const trace: string[] = [];

    const headersSchema = z.object({
      "x-version": z.string().transform((v) => {
        trace.push("headers");
        return v;
      }),
    });

    const paramsSchema = z.object({
      id: z.coerce.number().transform((v) => {
        trace.push("params");
        return v;
      }),
    });

    const querySchema = z.object({
      filter: z.string().transform((v) => {
        trace.push("query");
        return v;
      }),
    });

    const bodySchema = z.object({
      payload: z.string().transform((v) => {
        trace.push("body");
        return v;
      }),
    });

    const authGuard = guard({
      name: "authGuard",
      handler: () => {
        trace.push("guard");
        return { user: "verified" };
      },
    });

    const descriptor = route({
      headers: headersSchema,
      params: paramsSchema,
      query: querySchema,
      body: bodySchema,
      before: [authGuard],
      handler: (ctx: any) => {
        trace.push("handler");
        return json(200, {
          version: ctx.headers["x-version"],
          id: ctx.params.id,
          filter: ctx.query.filter,
          payload: ctx.body.payload,
          user: ctx.user,
        });
      },
    });

    const compiled = compileRoute("POST /items/:id", descriptor as never, {});
    const req = new Request("https://example.com/items/123?filter=active", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Version": "v1",
      },
      body: JSON.stringify({ payload: "test-payload" }),
    });
    (req as any).params = { id: "123" };

    const resp = await compiled.handler(req);
    expect(resp.status).toBe(200);
    const body = await resp.json();

    expect(trace).toEqual(["headers", "params", "query", "body", "guard", "handler"]);
    expect(body).toEqual({
      version: "v1",
      id: 123,
      filter: "active",
      payload: "test-payload",
      user: "verified",
    });
  });

  test("validation failure stops pipeline immediately before guards or handler", async () => {
    let guardCalled = false;
    let handlerCalled = false;

    const paramsSchema = z.object({ id: z.coerce.number().positive() });

    const testGuard = guard({
      name: "testGuard",
      handler: () => {
        guardCalled = true;
        return {};
      },
    });

    const descriptor = route({
      params: paramsSchema,
      before: [testGuard],
      handler: () => {
        handlerCalled = true;
        return text(200, "ok");
      },
    });

    const compiled = compileRoute("GET /items/:id", descriptor as never, {});
    const req = new Request("https://example.com/items/not-a-number");
    (req as any).params = { id: "not-a-number" };

    const resp = (await compiled.handler(req)) as Response;
    expect(resp.status).toBe(422);
    expect(guardCalled).toBe(false);
    expect(handlerCalled).toBe(false);
  });

  test("guard short-circuit stops pipeline before handler", async () => {
    let handlerCalled = false;

    const authGuard = guard({
      name: "authGuard",
      handler: () => json(401, { error: "unauthorized" }),
    });

    const descriptor = route({
      before: [authGuard],
      handler: () => {
        handlerCalled = true;
        return text(200, "ok");
      },
    });

    const compiled = compileRoute("GET /secret", descriptor as never, {});
    const resp = (await compiled.handler(new Request("https://example.com/secret"))) as Response;

    expect(resp.status).toBe(401);
    expect(handlerCalled).toBe(false);
  });

  test("synchronous pipeline (sync headers, params, query, guards, handler) executes synchronously", () => {
    const headersSchema = z.object({ "x-sync": z.string() });
    const paramsSchema = z.object({ id: z.coerce.number() });
    const querySchema = z.object({ q: z.string() });

    const syncG = guard({
      name: "syncG",
      handler: () => ({ g: 1 }),
    });

    const descriptor = route({
      headers: headersSchema,
      params: paramsSchema,
      query: querySchema,
      before: [syncG],
      handler: (ctx: any) => text(200, `id:${ctx.params.id},q:${ctx.query.q},g:${ctx.g}`),
    });

    const compiled = compileRoute("GET /items/:id", descriptor as never, {});
    const req = new Request("https://example.com/items/42?q=search", {
      headers: { "x-sync": "1" },
    });
    (req as any).params = { id: "42" };

    const result = compiled.handler(req);
    expect(result).toBeInstanceOf(Response);
    expect(result).not.toBeInstanceOf(Promise);
  });

  test("undeclared validators are never invoked", () => {
    let bodyValidatorCalled = false;

    const descriptor = route({
      handler: () => text(200, "fast"),
    });

    const compiled = compileRoute("GET /fast", descriptor as never, {});
    const req = new Request("https://example.com/fast");

    const resp = compiled.handler(req);
    expect(resp).toBeInstanceOf(Response);
    expect(bodyValidatorCalled).toBe(false);
    expect(req.bodyUsed).toBe(false);
  });
});
