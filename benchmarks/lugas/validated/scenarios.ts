/**
 * Lugas validated-route scenario (M5-003, repaired M6R1-002).
 *
 * Feature-equivalent to benchmarks/raw-bun/validated/scenarios.ts:
 * a POST /api/users route with bearer-token auth guard, JSON body
 * validation (name + email), and a 201 success response.
 *
 * Uses standard-schema compatible zod to mirror what a real validated
 * route looks like; the guard checks the Authorization header.
 */
import { defineApp } from "../../../src/core/app";
import { route } from "../../../src/core/route";
import { guard } from "../../../src/core/guard";
import { z } from "zod";

const authGuard = guard({
  name: "authGuard",
  handler: (ctx) => {
    const token = ctx.request.headers.get("authorization");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return { authenticated: true };
  },
});

const userBodySchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

export function createLugasValidated() {
  const app = defineApp({
    routes: {
      "/api/users": {
        POST: route({
          before: [authGuard],
          body: userBodySchema,
          handler: (ctx) => {
            const body = ctx.body as { name: string; email: string };
            return new Response(JSON.stringify({ ok: true, name: body.name }), {
              status: 201,
              headers: { "content-type": "application/json" },
            });
          },
        }),
      },
    },
  });
  return app;
}
