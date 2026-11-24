---
title: "Drizzle integration"
description: "An application-owned Drizzle instance as a Lugas service."
---
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

Drizzle's `bun-sqlite` driver is a thin wrapper over Bun's synchronous SQLite client, and its result shapes bite the natural single-row patterns (dogfood finding RF-2):

- **`.get()` returns a values-array, not a row object.** The `SELECT … WHERE id = ?`-shaped code you would expect to hand back one row returns an array of values. Reading it as a row silently produces arrays where objects were expected.
- **`.run()` resolves `void`.** Mutations give no way to read back what changed — there is no inserted id, no affected row.

The reliable single-row read/mutation path is **`RETURNING` through `.all()`**, which keeps its type argument:

```ts
// Insert and read the generated id back — one statement, one typed row.
const [row] = await database.all<{ id: number }>(
  sql`INSERT INTO users (name, email) VALUES (${name}, ${email}) RETURNING id`,
);
const id = row?.id; // undefined => the insert returned no row
```

This is Drizzle/bun-sqlite behavior, not something Lugas introduces or can smooth over — the adapter deliberately passes the instance through untouched (see [What the adapter guarantees](#what-the-adapter-guarantees)). Multi-row reads are unaffected: `.all()` returns the full typed array. The end-to-end patterns live in [`examples/realworld/`](https://github.com/ther12k/lugas/blob/main/examples/realworld/) (`app.ts`, mutations through `RETURNING` + `.all()`).

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

A runnable example lives under [`examples/drizzle`](https://github.com/ther12k/lugas/tree/main/examples/drizzle/).

## Diagnostics

| Code | Meaning |
|---|---|
| `LUGAS_DRIZZLE_001` | The passed value is not a recognizable Drizzle instance (missing `select`/`insert`/`update`/`delete` functions). |
| `LUGAS_DRIZZLE_002` | `closeOnDispose` is invalid, or the instance has no closable `$client.close()`. |
