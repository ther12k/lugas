import { cookie, defineApp, guard, json, parseCookies, route } from "../../src/index";

// Application-owned "session" — a signed-looking opaque token. Real apps
// validate against their auth library here (see docs/cookies.md).
const sessionGuard = guard({
  name: "session",
  handler: ({ request }) => {
    const token = parseCookies(request)["demo-session"];
    return token === "secret-token" ? { userId: "usr_demo" } : json(401, { error: "no session" });
  },
});

export const app = defineApp({
  routes: {
    "/login": {
      POST: route({
        handler: () =>
          json(200, { ok: true }, {
            headers: [
              ["set-cookie", cookie("demo-session", "secret-token", {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                maxAge: 3600,
              })],
            ] as [string, string][],
          }),
      }),
    },
    "/me": {
      GET: route({
        before: [sessionGuard],
        handler: (ctx) => json(200, { userId: ctx.userId }),
      }),
    },
    "/logout": {
      POST: route({
        handler: () =>
          json(200, { ok: true }, {
            headers: [["set-cookie", cookie("demo-session", "", { path: "/", maxAge: 0 })]] as [string, string][],
          }),
      }),
    },
  },
});

export default app;
