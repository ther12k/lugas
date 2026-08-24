import { defineApp } from "../../../src/index";
export default defineApp({
  routes: { "/ping": { GET: () => new Response("pong") } },
});
