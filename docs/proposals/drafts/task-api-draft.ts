/**
 * CA-26 DRAFT — task-management API design probe (NOT a shipped example).
 *
 * Purpose: verify that the owner-specified reference application
 * (public health, authenticated task routes, validation, consistent
 * errors, browser access via CORS) assembles from the PUBLIC exports at
 * 134f163 with ZERO proposed APIs. Any line that would have needed a new
 * API is marked [PROPOSED] — the verified result is that none were needed.
 *
 * This file lives under docs/proposals/ on purpose: it is a design
 * artifact for the core-and-middleware boundary proposal, not part of the
 * examples catalog, and it is not covered by the repo test gate.
 *
 * Session model is deliberately demo-grade (in-memory token set), matching
 * the realworld reference: first-party auth products are a standing
 * non-goal; real applications bring their own session store or Better
 * Auth (docs/cookies.md).
 */
import { cookie, defineApp, guard, json, parseCookies, problem, rateLimit, createMemoryRateLimitStore, route } from "../../../src/index";
import { z } from "zod";

// --- demo-grade session state (application-owned, in-memory) ---------------

const sessions = new Set<string>();

const session = guard({
  name: "session",
  handler: ({ request }) => {
    const token = parseCookies(request)["lugas_session"];
    if (token === undefined || !sessions.has(token)) {
      return problem(401, { title: "Not authenticated", status: 401, code: "NO_SESSION" });
    }
    return { user: "demo" };
  },
});

// --- task store (application-owned, in-memory) ------------------------------

interface Task { id: string; title: string; completed: boolean }
const tasks = new Map<string, Task>();
const createSchema = z.object({ title: z.string().min(1).max(80) });
const idParams = z.object({ id: z.string().min(1) });

/** Declaring the cookie header makes it a typed-client input on guarded
 * routes — the documented RF-5 pattern from the realworld dogfood. */
const cookieHeader = z.object({ cookie: z.string().optional() });

// --- app ----------------------------------------------------------------------

const loginStore = createMemoryRateLimitStore();

export const app = defineApp({
  // Public health endpoints: GET /health + GET /ready over the lifecycle.
  health: true,
  // Browser access from a local dev origin; credentials for the session cookie.
  cors: { origin: ["http://localhost:5173"], credentials: true },
  routes: {
    "/auth/login": {
      POST: route({
        // Strict limiter in front of the credential check (ADR-0034 shape:
        // application-owned store; swap in Redis/Postgres in production).
        before: [rateLimit({ limit: 5, windowMs: 60_000, store: loginStore, keyPrefix: "login:" })],
        body: z.object({ name: z.string().min(2).max(80) }),
        handler: () => {
          const token = crypto.randomUUID();
          sessions.add(token);
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
              "content-type": "application/json",
              "set-cookie": cookie("lugas_session", token, { httpOnly: true, sameSite: "lax", path: "/" }),
            },
          });
        },
      }),
    },
    "/auth/logout": {
      POST: route({
        before: [session],
        headers: cookieHeader,
        handler: (ctx) => {
          sessions.delete(parseCookies(ctx.request)["lugas_session"]!);
          return json(200, { ok: true }, { headers: [["set-cookie", cookie("lugas_session", "", { path: "/", maxAge: 0 })] as [string, string]] });
        },
      }),
    },
    "/api/tasks": {
      GET: route({
        before: [session],
        headers: cookieHeader,
        handler: () => json(200, { tasks: [...tasks.values()] }),
      }),
      POST: route({
        before: [session],
        headers: cookieHeader,
        body: createSchema,
        handler: (ctx) => {
          const task: Task = { id: crypto.randomUUID(), title: ctx.body.title, completed: false };
          tasks.set(task.id, task);
          return json(201, task);
        },
      }),
    },
    "/api/tasks/:id": {
      DELETE: route({
        before: [session],
        headers: cookieHeader,
        params: idParams,
        handler: (ctx) =>
          tasks.delete(ctx.params.id)
            ? new Response(null, { status: 204 })
            : problem(404, { title: "Task not found", status: 404, code: "TASK_NOT_FOUND" }),
      }),
    },
    "/api/tasks/:id/complete": {
      POST: route({
        before: [session],
        headers: cookieHeader,
        params: idParams,
        handler: (ctx) => {
          const task = tasks.get(ctx.params.id);
          if (task === undefined) {
            return problem(404, { title: "Task not found", status: 404, code: "TASK_NOT_FOUND" });
          }
          task.completed = true;
          return json(200, task);
        },
      }),
    },
  },
  notFound: (request) => problem(404, { title: "Not found", status: 404, detail: request.url }),
});
