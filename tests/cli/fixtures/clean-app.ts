import { defineApp } from "../../../src/index";
export default defineApp({
  routes: {
    "/users": { GET: () => new Response(JSON.stringify([{ id: 1 }]), { headers: { "content-type": "application/json" } }) },
    "/health": { GET: () => new Response("ok") },
  },
});
