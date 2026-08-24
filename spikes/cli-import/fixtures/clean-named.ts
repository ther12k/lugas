import { defineApp } from "../../../src/index";
export const app = defineApp({
  routes: { "/ping": { GET: () => new Response("pong") } },
});
