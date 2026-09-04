import { defineApp, defineModule, guard, json, route } from "lugas";
import { z } from "zod"; // any Standard Schema v1 validator works

const auth = guard({
  name: "auth",
  handler: (ctx) => {
    if (!ctx.request.headers.get("authorization")) return json(401, { error: "unauthorized" });
    return { user: { id: "u_1" } };
  },
});

export default defineApp({
  modules: [
    defineModule({
      name: "invoices",
      routes: {
        "/invoices": {
          POST: route({
            before: [auth],
            body: z.object({ amount: z.number().positive(), currency: z.string().length(3) }),
            handler: (ctx) => json(201, { id: "inv_1", amount: ctx.body.amount, user: ctx.user.id }),
          }),
        },
      },
    }),
  ],
});
