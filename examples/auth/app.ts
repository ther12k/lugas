import { defineApp } from "../../src/core/app";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";

// Application-level authentication guard
const authenticate = guard({
  name: "authenticate",
  handler: ({ request }) => {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json(401, { error: "Missing or invalid Bearer token" });
    }
    const token = authHeader.slice(7);
    // Application-defined mock token verification
    if (token === "admin-token") {
      return { user: { id: "user_1", role: "admin" } };
    }
    if (token === "member-token") {
      return { user: { id: "user_2", role: "member" } };
    }
    return json(401, { error: "Invalid token credentials" });
  },
});

// Application-level role check guard
const requireAdmin = guard({
  name: "requireAdmin",
  handler: (ctx: any) => {
    if (ctx.user?.role !== "admin") {
      return json(403, { error: "Admin role required" });
    }
    return { adminVerified: true };
  },
});

export const app = defineApp({
  routes: {
    "/public": {
      GET: route({
        handler: () => json(200, { message: "Publicly accessible" }),
      }),
    },
    "/profile": {
      GET: route({
        before: [authenticate],
        handler: (ctx: any) => json(200, { user: ctx.user }),
      }),
    },
    "/admin/dashboard": {
      GET: route({
        before: [authenticate, requireAdmin],
        handler: (ctx: any) => json(200, { message: "Welcome Admin", user: ctx.user }),
      }),
    },
  },
});

export default app;
