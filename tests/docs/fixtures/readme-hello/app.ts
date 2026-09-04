// app.ts
import { defineApp, json, route } from "lugas";

const app = defineApp({
  routes: {
    "/hello": {
      GET: route({
        handler: () => json(200, { message: "Hello from Lugas" }),
      }),
    },
  },
});

export default app;
