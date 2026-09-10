import { defineApp, guard, websocket } from "../../src/index";

const auth = guard({
  name: "auth",
  handler: ({ request }) => {
    const token = new URL(request.url).searchParams.get("token");
    return token === "secret" ? { user: "usr_demo" } : new Response(null, { status: 401 });
  },
});

export const app = defineApp({
  routes: {
    "/echo": {
      GET: websocket({
        before: [auth],
        open: (ws, ctx) => ws.send(`welcome ${ctx.user}`),
        message: (ws, message, ctx) => ws.send(`echo to ${ctx.user}: ${message}`),
        close: (_ws, code, reason, ctx) => console.log(`socket closed for ${ctx.user}: ${code} ${reason}`),
      }),
    },
  },
});

export default app;
