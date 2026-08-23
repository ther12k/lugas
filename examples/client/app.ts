/**
 * Shared server↔client contract fixture (M3-016).
 *
 * Built exclusively from public exports and imported by BOTH the runtime
 * integration tests, the compile-time contract tests, and the example smoke
 * — one application definition proves all three layers against each other.
 */
import { defineApp, guard, json, route } from "../../src/index";
import type { TypedResponse } from "../../src/index";
import { z } from "zod";

const authGuard = guard<unknown, TypedResponse<401, { error: string }> | { readonly auth: true }>({
  name: "auth",
  handler: ({ request }) => {
    if (request.headers.get("authorization") !== "Bearer valid") {
      return json(401, { error: "unauthorized" });
    }
    return { auth: true };
  },
});

const roleGuard = guard<unknown, TypedResponse<403, { error: string }> | { readonly roleChecked: true }>({
  name: "role",
  handler: ({ request }) => {
    if (request.headers.get("x-role") !== "admin") {
      return json(403, { error: "forbidden" });
    }
    return { roleChecked: true };
  },
});

type WithQuery<Q> = {
  readonly request: Request;
  readonly services: unknown;
  readonly params: Record<string, string>;
} & { readonly query?: Q };

type WithBody<B> = {
  readonly request: Request;
  readonly services: unknown;
  readonly params: Record<string, string>;
} & { readonly body?: B };

export const contractApp = defineApp({
  routes: {
    "/users/:id": {
      GET: route({
        params: z.object({ id: z.string().min(1) }),
        query: z.object({
          q: z.string().default(""),
          tag: z.array(z.string()).optional(),
        }),
        handler: (ctx: WithQuery<{ q: string; tag?: string[] }>) =>
          json(200, { id: ctx.params.id!, q: ctx.query?.q ?? "", tag: ctx.query?.tag ?? null }),
      }),
    },
    "/users": {
      POST: route({
        headers: z.object({ authorization: z.string().min(1) }),
        body: z.object({ name: z.string(), tags: z.array(z.string()).optional() }),
        handler: (ctx: WithBody<{ name: string }>) => json(201, { created: true, name: ctx.body?.name }),
      }),
    },
    "/empty": {
      GET: route({ handler: () => new Response(null, { status: 204 }) }),
    },
    "/guarded": {
      GET: route({ before: [authGuard], handler: () => json(200, { secret: true }) }),
    },
    "/admin": {
      GET: route({ before: [authGuard, roleGuard], handler: () => json(200, { admin: true }) }),
    },
    "/missing-thing": {
      GET: route({ handler: () => json(404, { code: "NOPE" }) }),
    },
    "/conflict": {
      PUT: route({ handler: () => json(409, { code: "DUP" }) }),
    },
    "/strict-body": {
      POST: route({
        body: z.object({ n: z.number() }),
        handler: (ctx: WithBody<{ n: number }>) => json(200, { n: ctx.body?.n }),
      }),
    },
    "/strict-query": {
      GET: route({
        query: z.object({ page: z.coerce.number().int().positive() }),
        handler: (ctx: WithQuery<{ page: number }>) => json(200, { page: ctx.query?.page }),
      }),
    },
    "/slow": {
      GET: route({
        handler: async () => {
          await Bun.sleep(400);
          return json(200, { late: true });
        },
      }),
    },
    "/boom": {
      GET: route({
        handler: () => {
          throw new Error("internal-detail");
        },
      }),
    },
  },
});
