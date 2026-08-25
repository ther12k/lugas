/**
 * Production-shaped CRUD proof API (M5-016).
 *
 * Demonstrates all alpha capabilities in one realistic in-memory API:
 * validation, auth guards, CRUD operations, error handling.
 */
import { defineApp, guard, json, route } from "../../src/index";
import { z } from "zod";

// --- In-memory store ---
const users = new Map<number, { id: number; name: string; email: string }>();
let nextId = 1;

// --- Guards ---
const auth = guard({
  name: "auth",
  handler: ({ request }) => {
    if (!request.headers.get("authorization")) {
      return json(401, { code: "UNAUTHORIZED" });
    }
    return {};
  },
});

const admin = guard({
  name: "admin",
  handler: ({ request }) => {
    if (request.headers.get("x-role") !== "admin") {
      return json(403, { code: "FORBIDDEN" });
    }
    return {};
  },
});

export const proofApp = defineApp({
  routes: {
    // List users
    "/users": {
      GET: route({
        handler: () => json(200, [...users.values()]),
      }),
      // Create user
      POST: route({
        before: [auth],
        body: z.object({ name: z.string().min(1), email: z.string().email() }),
        handler: (ctx) => {
          const id = nextId++;
          const user = { id, name: (ctx.body as any)?.name ?? "", email: (ctx.body as any)?.email ?? "" };
          users.set(id, user);
          return json(201, user);
        },
      }),
    },

    // Read single user
    "/users/:id": {
      GET: route({
        params: z.object({ id: z.coerce.number() }),
        handler: ({ params }) => {
          const user = users.get(params.id);
          if (!user) return json(404, { code: "USER_NOT_FOUND" });
          return json(200, user);
        },
      }),

      // Update user
      PATCH: route({
        before: [auth],
        params: z.object({ id: z.coerce.number() }),
        body: z.object({ name: z.string().optional(), email: z.string().email().optional() }),
        handler: ({ params, body }) => {
          const existing = users.get(params.id);
          if (!existing) return json(404, { code: "USER_NOT_FOUND" });
          const updated = { id: params.id, name: body.name ?? existing.name, email: body.email ?? existing.email };
          users.set(params.id, updated);
          return json(200, updated);
        },
      }),

      // Delete user
      DELETE: route({
        before: [auth, admin],
        params: z.object({ id: z.coerce.number() }),
        handler: ({ params }) => {
          if (!users.has(params.id)) return new Response(null, { status: 404 });
          users.delete(params.id);
          return new Response(null, { status: 204 });
        },
      }),
    },

    // Conflict demo
    "/conflict": {
      PUT: route({ handler: () => json(409, { code: "CONFLICT" }) }),
    },

    // Slow route for abort testing
    "/slow": {
      GET: route({ handler: async () => { await Bun.sleep(2000); return json(200, { late: true }); } }),
    },
  },
});
