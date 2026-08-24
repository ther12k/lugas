import { defineApp } from "../../../src/core/app";
import { guard } from "../../../src/core/guard";
import { route } from "../../../src/core/route";
import { z } from "zod";

const auth = guard({
  name: "auth",
  handler: () => ({ user: { id: "bench-user" } }),
});

export function createLugasValidated() {
  const app = defineApp({
    routes: {
      "/api/users": {
        POST: route({
          headers: z.object({ authorization: z.string() }),
          body: z.object({ name: z.string(), email: z.string().email() }),
          before: [auth],
          handler: ({ body, user }: { body: { name: string }; user?: unknown }) =>
            new Response(JSON.stringify({ ok: true, name: body.name }), { status: 201, headers: { "content-type": "application/json" } }),
        }),
      },
    },
  });
  return app;
}
