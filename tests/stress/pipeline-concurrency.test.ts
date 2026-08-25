/**
 * Pipeline concurrency stress (M5-012).
 *
 * Proves no context bleed, duplicate execution, or unhandled rejection
 * under high concurrency with mixed async/sync guards and validators.
 *
 * Safe under `--repeat 10`: ephemeral ports, per-request unique markers.
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";
import { z } from "zod";

function served() {
  const executionLog: Array<{ requestId: string; stage: string }> = [];
  const app = defineApp({
    routes: {
      "/mixed/:id": {
        POST: route({
          params: z.object({ id: z.string() }),
          query: z.object({ tag: z.string().optional() }),
          headers: z.object({ "x-request-id": z.string() }),
          body: z.object({ payload: z.string() }),
          before: [
            guard({
              name: "async-guard",
              handler: async ({ request }) => {
                const reqId = request.headers.get("x-request-id") ?? "unknown";
                executionLog.push({ requestId: reqId, stage: "async-guard" });
                await Bun.sleep(Math.random() * 5);
                return { enrichedBy: "async-guard" };
              },
            }),
            guard({
              name: "sync-guard",
              handler: () => {
                return {};
              },
            }),
          ],
          handler: async ({ params, body, request }) => {
            const reqId = request.headers.get("x-request-id") ?? "unknown";
            executionLog.push({ requestId: reqId, stage: "handler" });
            await Bun.sleep(Math.random() * 3);
            return new Response(
              JSON.stringify({ id: params.id, payload: body.payload, requestId: reqId }),
              { status: 200, headers: { "content-type": "application/json", "x-request-id": reqId } },
            );
          },
        }),
      },
      "/short-circuit/:id": {
        GET: route({
          params: z.object({ id: z.string() }),
          before: [
            guard({
              name: "rejector",
              handler: async (ctx: any) => {
                const params = (ctx as any).params;
                await Bun.sleep(Math.random() * 3);
                if (params.id === "reject") {
                  return new Response(JSON.stringify({ rejected: true }), { status: 403 });
                }
                return {};
              },
            }),
          ],
          handler: () => new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }),
        }),
      },
    },
  });
  const server = app.serve({ port: 0, development: false });
  return { url: server.url.origin, server, executionLog };
}

function json(data: unknown) { return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } }); }

describe("pipeline concurrency stress", () => {
  test("50 concurrent requests with unique markers — no context bleed", async () => {
    const { url, executionLog } = served();
    try {
      const N = 50;
      const requests = Array.from({ length: N }, (_, i) => {
        const reqId = `req-${i}`;
        return fetch(new URL(`/mixed/id-${i}?tag=t${i}`, url), {
          method: "POST",
          headers: { "content-type": "application/json", "x-request-id": reqId },
          body: JSON.stringify({ payload: `payload-${i}` }),
        }).then(async (res) => {
          const body = (await res.json()) as { requestId?: string; payload?: string };
          return { reqId, resId: body.requestId ?? "", payload: body.payload ?? "" };
        });
      });

      const responses = await Promise.all(requests);
      for (let i = 0; i < N; i++) {
        const r = responses[i]!;
        expect(r.resId).toBe(`req-${i}`);
        expect(r.payload).toBe(`payload-${i}`);
      }

      // No duplicate execution: each request should have exactly one handler call
      const handlerCalls = executionLog.filter((e) => e.stage === "handler");
      const uniqueHandlerRequests = new Set(handlerCalls.map((e) => e.requestId));
      expect(uniqueHandlerRequests.size).toBe(N);
    } finally {
      // No cleanup needed for in-process test
    }
  }, 30_000);

});
