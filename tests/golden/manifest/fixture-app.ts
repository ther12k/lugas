/**
 * Representative fixture app for manifest goldens (M4-009).
 *
 * Exercises every record shape the frozen v1 document allows post-ADR-0017:
 * module-attributed lugas routes, root lugas routes, ordered guards,
 * canonical validates, native static/handler rows, a `{dir}` entry, a bare
 * any-method descriptor (`"*"` claim), and a wildcard-free param route.
 */
import { defineApp, guard, json } from "../../../src/index";
import { defineModule } from "../../../src/core/module";
import { route } from "../../../src/core/route";
import { z } from "zod";

const auth = guard({ name: "auth", handler: () => json(401, { error: "x" }) });
const tenant = guard({ name: "tenant", handler: () => json(403, { error: "y" }) });

export function fixtureApp() {
  return defineApp({
    modules: [
      defineModule({
        name: "billing",
        routes: {
          "/invoices/:id": {
            GET: route({
              params: z.object({ id: z.string() }),
              query: z.object({ format: z.string().optional() }),
              handler: () => json(200, { ok: true }),
            }),
            DELETE: route({
              params: z.object({ id: z.string() }),
              before: [auth],
              handler: () => new Response(null, { status: 204 }),
            }),
          },
        },
      }),
    ],
    routes: {
      "/users": {
        POST: route({
          headers: z.object({ authorization: z.string() }),
          body: z.object({ name: z.string(), tags: z.array(z.string()).optional() }),
          before: [auth, tenant],
          handler: () => json(201, { created: true }),
        }),
      },
      "/health": { GET: new Response("ok") },
      "/legacy": () => new Response("legacy"),
      "/assets": { dir: "./public" },
      "/bare": route({ handler: () => json(200, { any: true }) }),
    },
  });
}
