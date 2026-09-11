/**
 * Realworld reference application (dogfood, 0.1.0 stabilization).
 *
 * Unlike the single-concept examples, this app composes every shipped
 * capability into one working whole — using only public exports exactly as
 * documented:
 *
 *   Drizzle service (lugas/drizzle) · validation (Standard Schema) ·
 *   cookie session guard (parseCookies/cookie) · SSE notifications ·
 *   WebSocket presence · multipart avatar upload · structured logging ·
 *   health/readiness · OpenAPI + Scalar · secure headers.
 *
 * The typed client smoke (client.ts) proves the same app type drives the
 * browser-safe client end to end.
 *
 * Run: bun run examples/realworld/server.ts
 */
import { Database } from "bun:sqlite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { z } from "zod";
import {
  cookie,
  defineApp,
  form,
  guard,
  json,
  parseCookies,
  problem,
  route,
  sse,
  websocket,
} from "lugas";
import { drizzleService } from "lugas/drizzle";

/** In-memory notification bus feeding the SSE stream. */
class EventBus {
  #listeners = new Set<(event: string, data: unknown) => void>();
  emit(event: string, data: unknown) {
    for (const listener of this.#listeners) listener(event, data);
  }
  subscribe(listener: (event: string, data: unknown) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}

const bus = new EventBus();

// --- Database (application-owned, Bun SQLite in memory) --------------------

const sqlite = new Database(":memory:");
sqlite.run(`CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
)`);
sqlite.run(`INSERT INTO users (name, email) VALUES ('ada', 'ada@example.com')`);

const db = drizzle(sqlite);

/**
 * Services map type for handler access. `route()` cannot infer both the
 * services map and schema slots from one explicit type parameter today
 * (dogfood finding RF-1); the repo's own clean-room tests use this cast.
 */
type AppServices = { database: typeof db };

// --- Sessions (demo-grade: in-memory token -> user id) ---------------------

const sessions = new Map<string, number>();

function resolveSession(token: string | null | undefined, via: string) {
  if (token === null || token === undefined) {
    return json(401, { error: `not signed in (${via})` });
  }
  const userId = sessions.get(token);
  if (userId === undefined) {
    return json(401, { error: "unknown session" });
  }
  const row = sqlite
    .query("SELECT id, name FROM users WHERE id = ?")
    .get(userId) as { id: number; name: string } | undefined;
  if (row === undefined) {
    return json(401, { error: "session user no longer exists" });
  }
  return { user: { id: row.id, name: row.name, token } };
}

/** HTTP routes: session cookie. */
const session = guard({
  name: "session",
  handler: ({ request }) => resolveSession(parseCookies(request)["session"], "cookie"),
});

/**
 * WebSocket routes: the browser WebSocket API cannot set Cookie headers on
 * cross-origin handshakes, so the documented WS pattern is a query token
 * (websockets.md) — same session map, same lookup.
 */
const wsSession = guard({
  name: "ws-session",
  handler: ({ request }) =>
    resolveSession(new URL(request.url).searchParams.get("session"), "query"),
});

// --- Schemas ----------------------------------------------------------------

const idParams = z.object({ id: z.coerce.number().int().positive() });
const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const createBody = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
});
const updateBody = z.object({ name: z.string().min(2).max(80) });
const loginBody = z.object({ name: z.string().min(2).max(80) });
/** Declaring the cookie header makes it a typed client input on guarded routes. */
const cookieHeader = z.object({ cookie: z.string().optional() });

type User = { id: number; name: string; email: string };

// --- App --------------------------------------------------------------------

export const app = defineApp({
  health: true,
  secureHeaders: true,
  openapi: {
    document: {
      title: "Lugas realworld API",
      version: "1.0.0",
      description:
        "Reference application composing every shipped Lugas capability.",
    },
    ui: true,
  },
  logging: {
    level: "info",
    access: true,
    requestIds: true,
    sink: (entry) => console.log(JSON.stringify(entry)),
  },
  services: {
    database: drizzleService({ db, name: "database", closeOnDispose: true }),
  },
  routes: {
    "/auth/login": {
      POST: route({
        openapi: { summary: "Sign in as a user by name", tags: ["Auth"] },
        body: loginBody,
        handler: async (ctx) => {
          const row = sqlite
            .query("SELECT id, name FROM users WHERE name = ?")
            .get(ctx.body.name) as { id: number; name: string } | undefined;
          if (row === undefined) {
            return problem(404, {
              title: "Unknown user",
              detail: `No user named ${ctx.body.name}`,
            });
          }
          const token = crypto.randomUUID();
          sessions.set(token, row.id);
          return json(
            200,
            { user: { id: row.id, name: row.name } },
            {
              headers: [
                [
                  "set-cookie",
                  cookie("session", token, {
                    httpOnly: true,
                    sameSite: "lax",
                    path: "/",
                    maxAge: 60 * 60,
                  }),
                ],
              ] as [string, string][],
            },
          );
        },
      }),
    },
    "/auth/logout": {
      POST: route({
        openapi: { summary: "Expire the session cookie", tags: ["Auth"] },
        before: [session],
        handler: (ctx) => {
          sessions.delete(ctx.user.token);
          return json(
            200,
            { ok: true },
            {
              headers: [
                ["set-cookie", cookie("session", "", { path: "/", maxAge: 0 })],
              ] as [string, string][],
            },
          );
        },
      }),
    },
    "/me": {
      GET: route({
        openapi: { summary: "Current session user", tags: ["Auth"] },
        before: [session],
        headers: cookieHeader,
        handler: (ctx) => json(200, { user: ctx.user }),
      }),
    },
    "/users": {
      GET: route({
        openapi: { summary: "List users (paginated)", tags: ["Users"] },
        query: listQuery,
        handler: async (ctx) => {
          const { database } = ctx.services as AppServices;
          const rows = await database.all<User>(
            sql`SELECT id, name, email FROM users ORDER BY id LIMIT ${ctx.query.limit} OFFSET ${(ctx.query.page - 1) * ctx.query.limit}`,
          );
          return json(200, { users: rows, page: ctx.query.page });
        },
      }),
      POST: route({
        openapi: { summary: "Create a user", tags: ["Users"] },
        body: createBody,
        handler: async (ctx) => {
          try {
            const { database } = ctx.services as AppServices;
            // drizzle's bun-sqlite .get() returns a values-array, not a row
            // object — .all() with RETURNING is the reliable single-row path.
            const [row] = await database.all<{ id: number }>(
              sql`INSERT INTO users (name, email) VALUES (${ctx.body.name}, ${ctx.body.email}) RETURNING id`,
            );
            const id = row?.id;
            bus.emit("user.created", { id, name: ctx.body.name });
            return json(201, { id, ...ctx.body });
          } catch (error) {
            // UNIQUE(email) violation is the one expected failure.
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes("UNIQUE")) {
              return problem(409, {
                title: "Email already registered",
                detail: ctx.body.email,
              });
            }
            throw error;
          }
        },
      }),
    },
    "/users/:id": {
      GET: route({
        openapi: { summary: "Get a user", tags: ["Users"] },
        params: idParams,
        handler: async (ctx) => {
          const { database } = ctx.services as AppServices;
          const [row] = await database.all<User>(
            sql`SELECT id, name, email FROM users WHERE id = ${ctx.params.id}`,
          );
          return row === undefined
            ? problem(404, { title: "User not found", detail: `id ${ctx.params.id}` })
            : json(200, row);
        },
      }),
      PATCH: route({
        openapi: { summary: "Rename a user", tags: ["Users"] },
        before: [session],
        headers: cookieHeader,
        params: idParams,
        body: updateBody,
        handler: async (ctx) => {
          const { database } = ctx.services as AppServices;
          const updated = await database.all<{ id: number }>(
            sql`UPDATE users SET name = ${ctx.body.name} WHERE id = ${ctx.params.id} RETURNING id`,
          );
          return updated === undefined
            ? problem(404, { title: "User not found" })
            : json(200, { id: ctx.params.id, name: ctx.body.name });
        },
      }),
      DELETE: route({
        openapi: { summary: "Delete a user", tags: ["Users"] },
        before: [session],
        headers: cookieHeader,
        params: idParams,
        handler: async (ctx) => {
          const { database } = ctx.services as AppServices;
          const deleted = await database.all<{ id: number }>(
            sql`DELETE FROM users WHERE id = ${ctx.params.id} RETURNING id`,
          );
          return deleted === undefined
            ? problem(404, { title: "User not found" })
            : json(200, { deleted: ctx.params.id });
        },
      }),
    },
    "/users/:id/avatar": {
      POST: route({
        openapi: { summary: "Upload an avatar (multipart)", tags: ["Users"] },
        before: [session],
        headers: cookieHeader,
        params: idParams,
        body: form({ maxFiles: 1, maxFileSize: 1024 * 1024 }),
        handler: (ctx) => {
          const avatar = ctx.body.files["avatar"];
          if (avatar === undefined) {
            return problem(422, {
              title: "Missing file part",
              detail: 'expected file part "avatar"',
            });
          }
          return json(201, {
            id: ctx.params.id,
            avatar: { name: avatar.name, type: avatar.type, size: avatar.size },
          });
        },
      }),
    },
    "/events": {
      GET: route({
        openapi: { summary: "SSE notification stream", tags: ["Events"] },
        before: [session],
        headers: cookieHeader,
        handler: (ctx) =>
          sse({
            heartbeatMs: 15_000,
            start: (writer) => {
              writer.retry(3000);
              writer.send({ event: "connected", data: { user: ctx.user.name } });
              return bus.subscribe((event, data) =>
                writer.send({ event, data: JSON.stringify(data) }),
              );
            },
          }),
      }),
    },
    "/ws": {
      GET: websocket({
        before: [wsSession],
        open: (ws, ctx) => {
          ws.subscribe("presence");
          ws.publish("presence", JSON.stringify({ join: ctx.user.name }));
        },
        message: (ws, message, ctx) => {
          ws.publish(
            "presence",
            `${ctx.user.name}: ${typeof message === "string" ? message : "(binary)"}`,
          );
        },
        close: (ws, _code, _reason, ctx) => {
          ws.publish("presence", JSON.stringify({ leave: ctx.user.name }));
        },
      }),
    },
  },
});

export type App = typeof app;
