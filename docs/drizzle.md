---
type: Guide
title: Drizzle Integration
status: current
tags:
- guide
- drizzle
- services
- database
---

# Drizzle integration

Lugas integrates [Drizzle ORM](https://orm.drizzle.team) through the optional `lugas/drizzle` subpath: an application-owned instance exposed as a Lugas service with lifecycle, startup validation, and stable diagnostics. The adapter never imports `drizzle-orm` — Drizzle stays at the version *your* application chooses, and Lugas keeps zero production dependencies.

The philosophy (ADR-0026): Lugas does not become an ORM framework. Schema design, migrations, transactions, connection pooling, tenancy boundaries, and credentials stay application-owned. If you can `service({ name: "database", value: db })`, you already have the essentials — `drizzleService()` adds validation, opt-in disposal, and a tested composition.

## Install

```bash
bun add drizzle-orm        # the application's own dependency
bun add lugas@beta  # 0.1.0-beta.3+
```

## Declare the service

```ts
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { defineApp, json, route } from "lugas";
import { drizzleService } from "lugas/drizzle";

const db = drizzle(new Database("app.sqlite"));

export default defineApp({
  services: {
    database: drizzleService({ db, name: "database" }),
  },
  routes: {
    "/users/:id": {
      GET: route<{ database: typeof db }>({
        params: /* your Standard Schema validator */,
        handler: async (ctx) => {
          const row = await ctx.services.database.query.users.findFirst();
          return json(200, row);
        },
      }),
    },
  },
});
```

Handlers reach the instance through `ctx.services.<name>` — the typed services contract — with the **exact Drizzle instance type** preserved: `select()`, `query`, and `$client` all typecheck. Any driver works the same way (`drizzle-orm/node-postgres`, `drizzle-orm/mysql2`, `drizzle-orm/bun-sqlite`, …); the adapter contains no driver branches.

## Result shapes on bun-sqlite

One read path on the `bun-sqlite` driver does not hand back row objects, and it is the one raw SQL reaches for (dogfood finding RF-2). Asking for a single row, on drizzle-orm `0.45.2` with Bun `1.4.0`:

| Read path | Matching row | No match |
|---|---|---|
| ``db.get(sql`SELECT …`)`` | **a values-array** — `[1, "ada"]` | `undefined` |
| ``db.all(sql`SELECT …`)`` | an array of row objects | `[]` |
| `db.select().from(users).where(…).get()` | a row object | `undefined` |
| `await db.query.users.findFirst(…)` | a row object | `undefined` |

Only the first row is a trap: the `SELECT … WHERE id = ?` shape you would expect to return one row object returns an array of values, so `row.name` reads `undefined`. The query builder and the relational query API are unaffected.

For raw SQL, read a typed single row through `.all()` and destructure. For mutations, `RETURNING` through `.all()` gives you the row the statement produced:

```ts
// Insert and read the generated id back — one statement, one typed row.
const [row] = await database.all<{ id: number }>(
  sql`INSERT INTO users (name, email) VALUES (${name}, ${email}) RETURNING id`,
);
const id = row?.id;
```

`.all()` always answers an array — `[]` when nothing came back, never `undefined` — so test the array itself:

```ts
const updated = await database.all<{ id: number }>(
  sql`UPDATE users SET name = ${name} WHERE id = ${id} RETURNING id`,
);
if (updated.length === 0) return problem(404, { title: "User not found" }); // `=== undefined` never fires
```

Mutations without `RETURNING` still report what they did: `.run()` returns Bun's `Changes` object (`{ changes, lastInsertRowid }`), not `void`.

This is Drizzle/bun-sqlite behavior, not something Lugas introduces or can smooth over — the adapter deliberately passes the instance through untouched (see [What the adapter guarantees](#what-the-adapter-guarantees)). For the raw-`sql` mutation pattern, see `examples/realworld/app.ts`.

## What the adapter guarantees

- **Startup validation** — a value missing the structural CRUD surface (`select`, `insert`, `update`, `delete` functions) fails at declaration time with `LUGAS_DRIZZLE_001`, not at first request.
- **No implicit I/O** — declaring the service runs no connection, query, ping, or migration. There is no `migrate()` API here; run migrations in your own deploy step.
- **No transaction wrapping** — Drizzle owns transactions and savepoints; the adapter adds no competing vocabulary.
- **Deterministic lifecycle** — the service participates in the standard lifecycle: `init` order (there is no adapter `init`), drain-ordered shutdown, reverse disposal.
- **Replaceable in tests** — validation is structural (no `instanceof`, no drizzle-orm import), so a fake object with the four methods is a valid service in tests.

## Shutdown

By default there is **no dispose**: the application owns closing its database.

```ts
// Explicit opt-in: close the underlying client during lifecycle shutdown.
drizzleService({ db, name: "database", closeOnDispose: true });
```

`closeOnDispose: true` wires `dispose` through the instance's structural `$client.close()`. If no closable client exists (for example, a pool exposing `end()` instead), the declaration fails closed with `LUGAS_DRIZZLE_002` — compose `service()` directly and dispose however your client requires:

```ts
import { service } from "lugas";

service({
  name: "database",
  value: db,
  dispose: (db) => db.$client.end(),
});
```

## Testing

Because validation is structural, tests can substitute a fake — or use a real in-memory Bun SQLite database:

```ts
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { drizzleService } from "lugas/drizzle";

const db = drizzle(new Database(":memory:"));

const app = defineApp({
  services: { database: drizzleService({ db, name: "database" }) },
  /* routes */
});
```

A runnable example lives under [`examples/drizzle`](../examples/drizzle/).

## Diagnostics

| Code | Meaning |
|---|---|
| `LUGAS_DRIZZLE_001` | The passed value is not a recognizable Drizzle instance (missing `select`/`insert`/`update`/`delete` functions). |
| `LUGAS_DRIZZLE_002` | `closeOnDispose` is invalid, or the instance has no closable `$client.close()`. |
