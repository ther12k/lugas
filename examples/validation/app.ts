import { z } from "zod";
import * as v from "valibot";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";

export const app = defineApp({
  routes: {
    "/search": {
      GET: route({
        query: z.object({
          q: z.string().min(1),
          page: z.coerce.number().int().positive().default(1),
        }),
        handler: (ctx) => json(200, { query: ctx.query }),
      }),
    },
    "/users/:id": {
      GET: route({
        params: v.object({
          id: v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(1)),
        }),
        headers: z.object({
          "x-api-version": z.string().min(1),
        }),
        handler: (ctx) =>
          json(200, { id: ctx.params.id, version: ctx.headers["x-api-version"] }),
      }),
      POST: route({
        params: z.object({
          id: z.coerce.number().int().positive(),
        }),
        body: z.object({
          name: z.string().min(2),
          email: z.string().email(),
        }),
        handler: (ctx) =>
          json(201, { id: ctx.params.id, user: ctx.body }),
      }),
    },
  },
});

export default app;
