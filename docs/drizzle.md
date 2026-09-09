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
bun add lugas@beta
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
