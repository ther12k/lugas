/**
 * Lugas plain-route scenarios (M5-002).
 *
 * Feature-equivalent to benchmarks/raw-bun/ fixtures: static response,
 * synchronous JSON, async JSON, and params route.
 */
import { defineApp } from "../../../src/core/app";
import { route } from "../../../src/core/route";

export function createLugasPlain() {
  const app = defineApp({
    routes: {
      "/static": { GET: new Response("static") },
      "/json": {
        GET: route({
          handler: () => new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } }),
        }),
      },
      "/async": {
        GET: route({
          handler: async () => new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } }),
        }),
      },
      "/params/:id": {
        GET: route({
          handler: ({ params }: { params: Record<string, string> }) =>
            new Response(JSON.stringify({ id: params.id }), { headers: { "content-type": "application/json" } }),
        }),
      },
    },
  });
  return app;
}
