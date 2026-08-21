import { describe, expect, test } from "bun:test";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";
import { compileRoute } from "../../src/internal/compile-route";
import { json, text } from "../../src/core/response";

describe("Guard context enrichment integration", () => {
  test("enriches context sequentially across multiple guards to handler", () => {
    const userGuard = guard({
      name: "userGuard",
      handler: () => ({ user: { id: "u123", role: "admin" } }),
    });

    const tenantGuard = guard({
      name: "tenantGuard",
      handler: (ctx: any) => {
        expect(ctx.user).toEqual({ id: "u123", role: "admin" });
        return { tenantId: `t_${ctx.user.id}` };
      },
    });

    const descriptor = route({
      before: [userGuard, tenantGuard],
      handler: (ctx: any) => {
        return json(200, {
          userId: ctx.user.id,
          role: ctx.user.role,
          tenantId: ctx.tenantId,
        });
      },
    });

    const compiled = compileRoute("GET /context", descriptor as never, {});
    const resp = compiled.handler(new Request("https://example.com/context")) as Response;

    expect(resp.status).toBe(200);
  });

  test("rejects guard attempt to overwrite reserved base context key 'request'", () => {
    const maliciousGuard = guard({
      name: "maliciousGuard",
      handler: () => ({ request: "evil-overwrite" }),
    });

    const descriptor = route({
      before: [maliciousGuard],
      handler: () => text(200, "ok"),
    });

    const compiled = compileRoute("GET /overwrite", descriptor as never, {});
    expect(() => compiled.handler(new Request("https://example.com/overwrite"))).toThrow(
      "cannot overwrite reserved context key 'request'",
    );
  });

  test("rejects guard attempt to overwrite reserved base context key 'services'", () => {
    const maliciousGuard = guard({
      name: "maliciousServices",
      handler: () => ({ services: "evil-services" }),
    });

    const descriptor = route({
      before: [maliciousGuard],
      handler: () => text(200, "ok"),
    });

    const compiled = compileRoute("GET /overwrite-svc", descriptor as never, { db: 1 });
    expect(() => compiled.handler(new Request("https://example.com/overwrite-svc"))).toThrow(
      "cannot overwrite reserved context key 'services'",
    );
  });

  test("concurrent requests maintain isolated context objects", async () => {
    let callCounter = 0;
    const trackingGuard = guard({
      name: "trackingGuard",
      handler: () => {
        callCounter++;
        return { reqId: callCounter };
      },
    });

    const descriptor = route({
      before: [trackingGuard],
      handler: async (ctx: any) => {
        const initialId = ctx.reqId;
        await new Promise((r) => setTimeout(r, 2));
        return json(200, { reqId: ctx.reqId, matches: ctx.reqId === initialId });
      },
    });

    const compiled = compileRoute("GET /concurrent", descriptor as never, {});

    const [resp1, resp2] = await Promise.all([
      compiled.handler(new Request("https://example.com/concurrent")),
      compiled.handler(new Request("https://example.com/concurrent")),
    ]);

    const body1 = (await (resp1 as Response).json()) as { matches: boolean; reqId: number };
    const body2 = (await (resp2 as Response).json()) as { matches: boolean; reqId: number };

    expect(body1.matches).toBe(true);
    expect(body2.matches).toBe(true);
    expect(body1.reqId).not.toBe(body2.reqId);
  });
});
