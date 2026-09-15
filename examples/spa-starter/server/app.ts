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
import { TaskCreateSchema, completeTask, createTask, deleteTask, listTasks } from "./tasks";

const SESSION_COOKIE = "lugas_session";
const sessions = new Set<string>();

// Declared path params → validated, fully typed ctx.params at the handler.
const taskIdParams = z.object({ id: z.string() });

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
      "/api/tasks": {
        // Onboarding walkthrough: list is open (empty state = 200 + []).
        GET: route({ handler: () => json(200, { tasks: listTasks() }) }),
        // Declared schema → framework-validated body; the 422 branch is part
        // of the typed client contract, not an exception path.
        POST: route({
          body: TaskCreateSchema,
          handler: (ctx) => json(201, createTask(ctx.body)),
        }),
      },
      "/api/tasks/:id/complete": {
        // Protected mutation: 401 before login (NO_SESSION), 404 for unknown
        // ids — three typed outcomes the UI renders distinctly. Browsers
        // carry the session cookie automatically (same-origin default), so
        // no header slot is declared.
        POST: route({
          before: [requireSession],
          params: taskIdParams,
          handler: (ctx) => {
            const outcome = completeTask(ctx.params.id);
            return outcome.ok
              ? json(200, outcome.task)
              : problem(404, { title: "Task Not Found", status: 404, code: "TASK_NOT_FOUND" });
          },
        }),
      },
      "/api/tasks/:id": {
        DELETE: route({
          before: [requireSession],
          params: taskIdParams,
          handler: (ctx) =>
            deleteTask(ctx.params.id)
              ? new Response(null, { status: 204 })
              : problem(404, { title: "Task Not Found", status: 404, code: "TASK_NOT_FOUND" }),
        }),
      },
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
