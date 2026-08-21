import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json, problem, redirect, text } from "../../src/core/response";

export const app = defineApp({
  routes: {
    "/health": new Response("OK"),
    "/hello": route({ handler: () => json(200, { hello: "world" }) }),
    "/echo/:id": route({ handler: ({ params }) => json(200, { id: params.id }) }),
    "/plain": route({ handler: () => text(200, "plain text") }),
    "/login": route({ handler: () => redirect("/health") }),
    "/missing-example": route({ handler: () => problem(404, { title: "Not found" }) }),
  },
});

export default app;
