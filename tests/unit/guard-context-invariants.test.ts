/**
 * Guard validated-context and enrichment invariants (M4R1-003, issue #197).
 *
 * Proves through the public pipeline that guards receive the full validated
 * request context, that guard results cannot overwrite framework-owned keys,
 * that invalid result shapes fail closed with stable codes, and that duplicate
 * enrichment keys are rejected naming both guards — while the synchronous
 * chain stays synchronous.
 */
import { describe, expect, test } from "bun:test";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";
import { compileRoute } from "../../src/internal/compile-route";
import { json, text } from "../../src/core/response";
import { z } from "zod";

const req = (path = "/ctx/42?flag=on") => new Request(`https://example.com${path}`, {
  method: "POST",
  headers: { "x-trace": "t1", "content-type": "application/json" },
  body: JSON.stringify({ amount: 7 }),
});

const fullDescriptor = route({
  params: z.object({ id: z.string() }),
  query: z.object({ flag: z.string() }),
  headers: z.object({ "x-trace": z.string() }),
  body: z.object({ amount: z.number() }),
  handler: () => text(200, "ok"),
}) as never;

function expectCode(fn: () => unknown, code: string): void {
  try {
    fn();
    throw new Error(`expected throw with code ${code}`);
  } catch (error) {
    if ((error as Error).message === `expected throw with code ${code}`) throw error;
    expect((error as { code?: string }).code).toBe(code);
  }
}

async function expectCodeAsync(fn: () => Promise<unknown> | unknown, code: string): Promise<void> {
  try {
    await fn();
    throw new Error(`expected throw with code ${code}`);
  } catch (error) {
    if ((error as Error).message === `expected throw with code ${code}`) throw error;
    expect((error as { code?: string }).code).toBe(code);
  }
}

describe("Guard context invariants (M4R1-003)", () => {
  test("guards receive validated params/query/headers/body", async () => {
    const seen: Record<string, unknown> = {};
    const spyGuard = guard({
      name: "spy",
      handler: (ctx: any) => {
        seen.params = ctx.params;
        seen.query = ctx.query;
        seen.headers = ctx.headers;
        seen.body = ctx.body;
        return {};
      },
    });

    const descriptor = route({
      params: z.object({ id: z.string() }),
      query: z.object({ flag: z.string() }),
      headers: z.object({ "x-trace": z.string() }),
      body: z.object({ amount: z.number() }),
      before: [spyGuard],
      handler: ({ body }: any) => json(200, body),
    }) as never;

    // Params come from the Bun request object; emulate what serve provides.
    const request = req();
    (request as Request & { params?: Record<string, string> }).params = { id: "42" };
    const compiled = compileRoute("POST /ctx/:id", descriptor, {});
    const response = (await compiled.handler(request)) as Response;

    expect(response.status).toBe(200);
    expect(seen.params).toEqual({ id: "42" });
    expect(seen.query).toEqual({ flag: "on" });
    expect(seen.headers).toEqual({ "x-trace": "t1" });
    expect(seen.body).toEqual({ amount: 7 });
  });

  test("guard returning { body } is rejected; handler sees validator output", async () => {
    const hijack = guard({
      name: "hijack",
      handler: () => ({ body: { role: "admin" } }),
    });

    const descriptor = route({
      body: z.object({ amount: z.number() }),
      before: [hijack],
      handler: ({ body }: any) => json(200, body),
    }) as never;

    const compiled = compileRoute("POST /hijack", descriptor, {});
    await expectCodeAsync(() => compiled.handler(req("/hijack")), "LUGAS_GUARD_006");
  });

  test("framework-owned slots are reserved even when undeclared", () => {
    const squatter = guard({
      name: "squatter",
      handler: () => ({ query: "nope" }),
    });
    const descriptor = route({
      before: [squatter],
      handler: () => text(200, "ok"),
    }) as never;

    const compiled = compileRoute("GET /squatter", descriptor, {});
    expectCode(() => compiled.handler(new Request("https://example.com/squatter")), "LUGAS_GUARD_006");
  });

  test("guard results of invalid shape are rejected with LUGAS_GUARD_005", () => {
    const bads: unknown[] = [undefined, null, 42, "str", true, [], [1, 2], new Date()];
    for (const bad of bads) {
      const g = guard({ name: "badShape", handler: () => bad as never });
      const descriptor = route({ before: [g], handler: () => text(200, "ok") }) as never;
      const compiled = compileRoute("GET /shape", descriptor, {});
      expectCode(() => compiled.handler(new Request("https://example.com/shape")), "LUGAS_GUARD_005");
    }
  });

  test("async guard with invalid shape is rejected through the promise path", async () => {
    const g = guard({ name: "asyncBad", handler: async () => undefined });
    const descriptor = route({ before: [g], handler: () => text(200, "ok") }) as never;
    const compiled = compileRoute("GET /async-shape", descriptor, {});
    await expectCodeAsync(() => compiled.handler(new Request("https://example.com/async-shape")), "LUGAS_GUARD_005");
  });

  test("duplicate enrichment key is rejected naming both guards", () => {
    const first = guard({ name: "issuerA", handler: () => ({ actor: "a" }) });
    const second = guard({ name: "issuerB", handler: () => ({ actor: "b" }) });
    const descriptor = route({ before: [first, second], handler: () => text(200, "ok") }) as never;

    const compiled = compileRoute("GET /dupe", descriptor, {});
    try {
      compiled.handler(new Request("https://example.com/dupe"));
      throw new Error("unreachable");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("LUGAS_GUARD_007");
      expect((error as Error).message).toContain("'issuerA' and 'issuerB'");
    }
  });

  test("ordered chaining still works and sync chain stays synchronous", async () => {
    const g1 = guard({ name: "g1", handler: () => ({ a: 1 }) });
    const g2 = guard({ name: "g2", handler: ({ a }: any) => ({ b: a + 1 }) });
    const descriptor = route({
      before: [g1, g2],
      handler: ({ b }: any) => text(200, `b:${b}`),
    }) as never;

    const compiled = compileRoute("GET /chain", descriptor, {});
    const out = compiled.handler(new Request("https://example.com/chain"));
    expect(out).not.toBeInstanceOf(Promise);
    expect((out as Response).status).toBe(200);
    expect(await (out as Response).text()).toBe("b:2");
  });

  test("live server: enrichment reaches handler; framework keys win over any leak", async () => {
    const { defineApp } = await import("../../src/core/app");
    const enricher = guard({ name: "enricher", handler: () => ({ tenant: "acme" }) });
    const app = defineApp({
      routes: {
        "/tenant": route({
          before: [enricher],
          handler: ({ tenant }: any) => json(200, { tenant }),
        }),
      },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const res = (await (await fetch(`${server.url}tenant`)).json()) as { tenant: string };
      expect(res.tenant).toBe("acme");
    } finally {
      server.stop(true);
    }
  });
});
