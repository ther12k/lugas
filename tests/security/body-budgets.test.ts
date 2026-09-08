/**
 * M7-003 — application-default and route-specific body budgets (ADR-0019).
 *
 * Pinned contract: selection chain `routeOverride ?? applicationDefault`,
 * clamped by the serve-time ceiling; above-ceiling configuration rejected at
 * startup; no-configuration behavior identical to the pre-M7-003 delegated
 * ceiling (bare transport 413); Lugas-level rejections use the Problem
 * Details envelope with status 413 (dual-threshold evidence); budgets on
 * routes without a declared body are rejected at startup (accepted narrower
 * form); no handler/validation execution on budget rejection.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, json, route } from "../../src";
import { resolveEffectiveBudget, createBudgetsContext } from "../../src/internal/body-budget";

const post = (url: string, body: string, headers: Record<string, string> = {}): Promise<Response> =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });

const makeApp = (config: { bodyBudget?: number }) => {
  let handlerRuns = 0;
  const app = defineApp({
    ...(config.bodyBudget !== undefined ? { bodyBudget: config.bodyBudget } : {}),
    routes: {
      "/echo": {
        POST: route({
          handler: (ctx) => {
            handlerRuns += 1;
            return json(200, { ran: true });
          },
        }),
      },
    },
  });
  return { app, ran: () => handlerRuns };
};

const zodishSchema = { "~standard": { version: 1, vendor: "lugas.test", validate: (v: unknown) => ({ value: v }) } } as never;

describe("M7-003 body budgets", () => {
  test("selection and clamping: override relaxes the default, never the ceiling", () => {
    const ctx = createBudgetsContext(1_000);
    expect(resolveEffectiveBudget(undefined, ctx)).toBe(1_000); // app default applies
    expect(resolveEffectiveBudget(5_000, ctx)).toBe(5_000); // override relaxes default
    ctx.ceilingRef.current = 2_000;
    expect(resolveEffectiveBudget(undefined, ctx)).toBe(1_000);
    expect(resolveEffectiveBudget(5_000, ctx)).toBe(2_000); // clamped to ceiling
    const unbounded = createBudgetsContext(undefined);
    expect(resolveEffectiveBudget(undefined, unbounded)).toBeUndefined(); // no config → no budget
  });

  test("no configuration: existing delegated ceiling behavior is unchanged (bare transport 413)", async () => {
    const { app, ran } = makeApp({});
    const server = app.serve({ port: 0, maxRequestBodySize: 64, development: false });
    try {
      const response = await post(`${new URL(server.url).origin}/echo`, JSON.stringify({ big: "x".repeat(200) }));
      expect(response.status).toBe(413);
      expect(await response.text()).toBe(""); // bare transport rejection, NOT Problem Details
      expect(ran()).toBe(0); // handler never executed
      const ok = await post(`${new URL(server.url).origin}/echo`, JSON.stringify({ v: 1 }));
      expect(ok.status).toBe(200);
    } finally {
      server.stop(true);
    }
  });

  test("route-level budget: oversized body gets the Lugas 413 problem; handler and schema never run", async () => {
    let ran = 0;
    const app = defineApp({
      routes: {
        "/upload": {
          POST: route({
            budget: 100,
            body: zodishSchema,
            handler: (ctx) => {
              ran += 1;
              return json(200, { got: (ctx as { body?: unknown }).body });
            },
          }),
        },
      },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const base = new URL(server.url).origin;
      const over = await post(`${base}/upload`, JSON.stringify({ v: "x".repeat(120) }));
      expect(over.status).toBe(413);
      expect(over.headers.get("content-type")).toContain("application/problem+json");
      expect(((await over.json()) as { code: string }).code).toBe("BODY_BUDGET_EXCEEDED");
      const within = await post(`${base}/upload`, JSON.stringify({ v: "y" }));
      expect(within.status).toBe(200);
      expect(ran).toBe(1);
    } finally {
      server.stop(true);
    }
  });

  test("application default budget enforced on declared-body routes; inclusive boundary", async () => {
    let handlerRuns = 0;
    const app = defineApp({
      bodyBudget: 100,
      routes: {
        "/upload": {
          POST: route({
            body: zodishSchema,
            handler: (ctx) => {
              handlerRuns += 1;
              return json(200, { got: (ctx as { body?: unknown }).body });
            },
          }),
        },
      },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const base = new URL(server.url).origin;
      // Exactly the budget is accepted (inclusive, mirroring the M7-002 pin).
      const exact = await post(`${base}/upload`, JSON.stringify({ v: "x".repeat(100 - JSON.stringify({ v: "" }).length) }));
      expect([200, 422]).toContain(exact.status); // accepted by the budget gate (schema may accept)
      expect(exact.status).toBe(200);
      // One byte over the budget: Lugas-level rejection with Problem Details.
      const over = await post(`${base}/upload`, JSON.stringify({ v: "x".repeat(101 - JSON.stringify({ v: "" }).length) }));
      expect(over.status).toBe(413);
      expect(over.headers.get("content-type")).toContain("application/problem+json");
      const problem = (await over.json()) as { code: string; status: number };
      expect(problem.code).toBe("BODY_BUDGET_EXCEEDED");
      expect(problem.status).toBe(413);
      expect(handlerRuns).toBe(1); // only the exact-boundary request reached the handler
    } finally {
      server.stop(true);
    }
  });

  test("route override relaxes a smaller application default (still under ceiling)", async () => {
    let ran = 0;
    const app = defineApp({
      bodyBudget: 50,
      routes: {
        "/large": {
          POST: route({
            budget: 200,
            body: zodishSchema,
            handler: (ctx) => {
              ran += 1;
              return json(200, { got: (ctx as { body?: unknown }).body });
            },
          }),
        },
      },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const base = new URL(server.url).origin;
      const mid = await post(`${base}/large`, JSON.stringify({ v: "y".repeat(120 - JSON.stringify({ v: "" }).length) }));
      expect(mid.status).toBe(200); // above the app default (50) but within the route override (200)
      expect(ran).toBe(1);
    } finally {
      server.stop(true);
    }
  });

  test("dual-threshold: Lugas 413 problem observed below Bun's transport threshold; envelopes stay distinct", async () => {
    const app = defineApp({
      routes: {
        "/upload": {
          POST: route({
            budget: 1_000,
            body: zodishSchema,
            handler: () => json(200, {}),
          }),
        },
      },
    });
    const server = app.serve({ port: 0, maxRequestBodySize: 100_000, development: false });
    try {
      const base = new URL(server.url).origin;
      const body = "z".repeat(2_000); // 2kB: above the Lugas budget, far below the 100kB ceiling
      const lugas = await post(`${base}/upload`, body);
      expect(lugas.status).toBe(413);
      expect(lugas.headers.get("content-type")).toContain("application/problem+json");
      // The same body class against the transport ceiling produces the pinned bare 413.
      const raw = await fetch(`${base}/upload`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "z".repeat(150_000),
      });
      expect(raw.status).toBe(413);
      expect(await raw.text()).toBe("");
    } finally {
      server.stop(true);
    }
  });

  test("streamed body without Content-Length is budgeted by consumed bytes", async () => {
    const app = defineApp({
      routes: {
        "/upload": {
          POST: route({
            budget: 50,
            body: zodishSchema,
            handler: () => json(200, {}),
          }),
        },
      },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const base = new URL(server.url).origin;
      const response = await fetch(`${base}/upload`, {
        method: "POST",
        headers: { "content-type": "application/json", "transfer-encoding": "chunked" },
        body: "q".repeat(200), // bun builds a chunked body (no content-length)
      });
      expect(response.status).toBe(413);
      expect(response.headers.get("content-type")).toContain("application/problem+json");
    } finally {
      server.stop(true);
    }
  });

  test("above-ceiling configuration rejected at startup (application default and route budget)", () => {
    const rejectWith = (build: () => unknown): string => {
      try {
        build();
        return "no-throw";
      } catch (error) {
        return (error as { code?: string }).code ?? "no-code";
      }
    };
    const app = defineApp({
      bodyBudget: 10,
      routes: { "/x": { POST: route({ budget: 5, body: zodishSchema, handler: () => json(200, {}) }) } },
    });
    const outcome = rejectWith(() => app.serve({ port: 0, maxRequestBodySize: 8, development: false }));
    expect(outcome).toBe("LUGAS_BODY_003");
    // Invalid shapes fail at definition time.
    expect(rejectWith(() => defineApp({ bodyBudget: 0, routes: {} }))).toBe("LUGAS_BODY_001");
    expect(rejectWith(() => route({ handler: () => json(200, {}), budget: 1.5 }))).toBe("LUGAS_BODY_001");
  });

  test("budget on a route without a declared body is rejected at startup (accepted narrower form)", () => {
    try {
      defineApp({
        routes: {
          "/raw": {
            POST: route({ budget: 100, handler: () => json(200, {}) }),
          },
        },
      });
      throw new Error("unreachable");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("LUGAS_BODY_002");
      expect((error as Error).message).toContain("/raw");
    }
  });
});
