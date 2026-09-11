/**
 * Typed-client smoke for the realworld reference app.
 *
 * Drives the running server through `createClient` typed by the app itself —
 * no generated SDK, no duplicated contract. Prints REALWORLD-CLIENT-OK when
 * every step passes.
 *
 * Run: bun run examples/realworld/client.ts
 * (server.ts must be running on the same port; default 3000)
 */
import { createClient } from "lugas/client";
import type { AppContract } from "lugas";
import type { App } from "./app";

const base = process.env.PORT ? `http://localhost:${process.env.PORT}` : "http://localhost:3000";
const api = createClient<AppContract<App>>({ baseUrl: base });

function assert(condition: unknown, label: string): asserts condition {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    process.exit(1);
  }
}

// 1. Public list call — typed query coercion on the wire.
const list = await api.get("/users", { query: { page: 1, limit: 10 } });
assert(list.ok && list.data.users.some((u) => u.name === "ada"), "GET /users lists seeded ada");

// 2. Validation failure is an ok:false outcome. Note: the framework's 422 is
// documented wire behavior but not part of the handler-declared status union,
// so it cannot be discriminated by literal here (dogfood finding RF-3).
const invalid = await api.post("/users", { body: { name: "x", email: "not-an-email" } });
assert(!invalid.ok, "POST /users invalid body -> ok:false");

// 3. Guarded route without a session -> 401.
// Declaring the optional cookie-header schema makes the options argument
// required (dogfood finding RF-4) — pass an empty headers object.
const anonymous = await api.get("/me", { headers: {} });
assert(!anonymous.ok && anonymous.status === 401, "GET /me without session -> 401");

// 4. Login with plain fetch (Set-Cookie capture), then reuse the session
//    cookie on typed calls — the client has no built-in cookie jar.
const login = await fetch(new URL("/auth/login", base), {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "ada" }),
});
assert(login.status === 200, "POST /auth/login (plain fetch)");
const sessionCookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
assert(sessionCookie.startsWith("session="), "login sets a session cookie");
// The guarded routes declare `cookie` in their headers schema, so the
// typed client accepts it as a structured input.
const withSession = { cookie: sessionCookie };

const me = await api.get("/me", { headers: withSession });
assert(me.ok && me.data.user.name === "ada", "GET /me with session cookie");

const created = await api.post("/users", {
  body: { name: "grace", email: "grace@example.com" },
});
assert(created.ok && created.status === 201, "POST /users creates grace");

if (created.ok) {
  const removed = await api.delete("/users/:id", {
    // Path params are typed as strings — the wire truth of path segments.
    params: { id: String(created.data.id) },
    headers: withSession,
  });
  assert(removed.ok && removed.data.deleted === created.data.id, "DELETE /users/:id (guarded)");
}

const notFound = await api.get("/users/:id", { params: { id: "99999" } });
assert(!notFound.ok && notFound.status === 404, "GET /users/:id 99999 -> typed 404");

console.log("REALWORLD-CLIENT-OK");
