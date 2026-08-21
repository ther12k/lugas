import { describe, expect, test } from "bun:test";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";
import { compileRoute } from "../../src/internal/compile-route";
import { json, text } from "../../src/core/response";

describe("Guard synchronous fast path", () => {
  const syncGuard1 = guard({
    name: "syncGuard1",
    handler: () => ({ g1: 1 }),
  });

  const syncGuard2 = guard({
    name: "syncGuard2",
    handler: (ctx: any) => ({ g2: ctx.g1 + 1 }),
  });

  const syncShortCircuitGuard = guard({
    name: "syncShortCircuit",
    handler: () => json(403, { error: "forbidden" }),
  });

  test("synchronous guard chain + sync handler returns non-Promise Response", () => {
    const descriptor = route({
      before: [syncGuard1, syncGuard2],
      handler: (ctx: any) => text(200, `val:${ctx.g2}`),
    });

    const compiled = compileRoute("GET /sync-guards", descriptor as never, {});
    const req = new Request("http://localhost/sync-guards");
    const result = compiled.handler(req);

    expect(result).toBeInstanceOf(Response);
    expect(result).not.toBeInstanceOf(Promise);
  });

  test("synchronous guard short-circuit returns non-Promise Response immediately", () => {
    const descriptor = route({
      before: [syncShortCircuitGuard, syncGuard2],
      handler: () => text(200, "unreachable"),
    });

    const compiled = compileRoute("GET /forbidden", descriptor as never, {});
    const result = compiled.handler(new Request("http://localhost/forbidden"));

    expect(result).toBeInstanceOf(Response);
    expect(result).not.toBeInstanceOf(Promise);
    expect((result as Response).status).toBe(403);
  });

  test("survives 1k sequential calls on synchronous fast path with zero Promise allocations", () => {
    const descriptor = route({
      before: [syncGuard1, syncGuard2],
      handler: (ctx: any) => json(200, { sum: ctx.g1 + ctx.g2 }),
    });

    const compiled = compileRoute("GET /benchmark", descriptor as never, {});
    const req = new Request("http://localhost/benchmark");

    for (let i = 0; i < 1000; i++) {
      const out = compiled.handler(req);
      if (out instanceof Promise) {
        throw new Error(`Iteration ${i} allocated a Promise on the synchronous guard fast path!`);
      }
      expect(out).toBeInstanceOf(Response);
    }
  });

  test("mixed sync and async guards transition to Promise", () => {
    const asyncGuard = guard({
      name: "asyncGuard",
      handler: async () => ({ asyncField: true }),
    });

    const descriptor = route({
      before: [syncGuard1, asyncGuard],
      handler: () => text(200, "async ok"),
    });

    const compiled = compileRoute("GET /mixed", descriptor as never, {});
    const result = compiled.handler(new Request("http://localhost/mixed"));

    expect(result).toBeInstanceOf(Promise);
  });
});
