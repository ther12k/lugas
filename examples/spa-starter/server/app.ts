/**
 * spa-starter application (ADR-0037 reference): typed API + hashed assets +
 * explicit SPA navigation fallback in one Bun process.
 *
 * STARTER_PROFILE=api-only strips assets and spa configuration — the
 * measurement baseline for the API-only vs API-plus-SPA comparison
 * (scripts/measure.ts). Everything else is identical.
 *
 * Imports resolve from the INSTALLED `lugas` package (file:lugas-starter.tgz,
 * refreshed by scripts/setup.ts) — never from the repository checkout.
 */
import { cookie, defineApp, form, guard, json, problem, route, sse } from "lugas";
import { z } from "zod";
import { ASSET_FILES, DIST } from "./asset-manifest";

const SESSION_COOKIE = "lugas_session";
const sessions = new Set<string>();

const requireSession = guard({
  name: "requireSession",
  handler: (ctx) => {
    const header = ctx.request.headers.get("cookie") ?? "";
    for (const part of header.split(";")) {
      const [name, ...rest] = part.trim().split("=");
      if (name === SESSION_COOKIE && rest.join("=") !== "" && sessions.has(rest.join("="))) {
        return { user: { id: "demo-user" } };
      }
    }
    return problem(401, { title: "Unauthorized", status: 401, code: "NO_SESSION" });
  },
});

const full = (process.env.STARTER_PROFILE ?? "full") !== "api-only";

export function createApp() {
  return defineApp({
    secureHeaders: true,
    routes: {
      "/api/ready": { GET: route({ handler: () => json(200, { ready: true }) }) },
      "/api/hello": {
        GET: route({ handler: () => json(200, { message: "hello from lugas" }) }),
      },
      "/api/greetings": {
        POST: route({
          body: z.object({ name: z.string().min(1).max(64) }),
          handler: (ctx) => json(201, { greeting: `Hello, ${ctx.body.name}!` }),
        }),
      },
      "/api/login": {
        POST: route({
          handler: () => {
            const token = crypto.randomUUID();
            sessions.add(token);
            return new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: {
                "content-type": "application/json",
                "set-cookie": cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/" }),
              },
            });
          },
        }),
      },
      "/api/me": {
        GET: route({
          before: [requireSession],
          handler: (ctx) => json(200, ctx.user),
        }),
      },
      "/api/uploads": {
        POST: route({
          body: form({ repeated: "preserve", maxFileSize: 1024 * 1024 }),
          handler: (ctx) =>
            json(201, {
              note: ctx.body.fields.note ?? null,
              files: Object.values(ctx.body.files).map((f) => ({ name: f.name, size: f.size, type: f.type })),
              groupSizes: Object.fromEntries(Object.entries(ctx.body.groups).map(([name, parts]) => [name, parts.length])),
            }),
        }),
      },
      "/api/events": {
        GET: route({
          handler: () =>
            sse({
              heartbeatMs: 2000,
              start: (writer) => {
                let n = 0;
                const timer = setInterval(() => {
                  n += 1;
                  writer.send({ id: n, event: "tick", data: { n } });
                  if (n >= 3) clearInterval(timer);
                }, 50);
                return () => clearInterval(timer);
              },
            }),
        }),
      },
    },
    ...(full
      ? {
          assets: { files: ASSET_FILES },
          spa: { shell: `${DIST}/index.html`, navigations: ["/", "/app/*"] as const },
        }
      : {}),
  });
}
