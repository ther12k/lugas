/**
 * Drizzle integration example (M9-001, ADR-0026).
 *
 * One concept: an application-owned Drizzle instance (Bun SQLite) declared
 * as a Lugas service — startup validation, typed ctx.services access, and
 * opt-in close-on-dispose. The adapter (lugas/drizzle) never imports
 * drizzle-orm; the driver choice stays with the application.
 *
 * Run: bun run examples/drizzle/server.ts
 */
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { defineApp, json, route } from "lugas";
import { drizzleService } from "lugas/drizzle";

const sqlite = new Database(":memory:");
sqlite.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");
sqlite.run("INSERT INTO users (name) VALUES ('ada'), ('grace')");

const db = drizzle(sqlite);

const app = defineApp({
  services: {
    database: drizzleService({ db, name: "database", closeOnDispose: true }),
  },
  routes: {
    "/users": {
      GET: route<{ database: typeof db }>({
        handler: async (ctx) => {
          const rows = await ctx.services.database.all<{ id: number; name: string }>(
            `SELECT id, name FROM users ORDER BY id`,
          );
          return json(200, rows);
        },
      }),
    },
  },
});

const server = app.serve({ port: 3000, development: false });

console.log(`drizzle example listening on ${server.url}`);
console.log(`  curl ${server.url}users`);

const res = await fetch(`${server.url}users`);
console.log(`GET /users -> ${res.status} ${await res.text()}`);

await server.lugasLifecycle.shutdown();
console.log("graceful shutdown closed the database (closeOnDispose: true)");
