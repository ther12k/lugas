/**
 * M9-001 — `lugas/drizzle` compile-time contract (ADR-0026).
 *
 * Pins that the exact Drizzle instance type survives `drizzleService()` into
 * the `defineApp({ services })` handler context — across two distinct
 * Drizzle db type instantiations — and that non-conforming objects are
 * rejected by the structural constraint.
 */
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { defineApp, route } from "../../src";
import { drizzleService, type DrizzleDbLike } from "../../src/drizzle";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
});

// Two distinct Drizzle db type instantiations on the same driver.
const plainDb = drizzle(new Database(":memory:"));
const schemaDb = drizzle({ client: new Database(":memory:"), schema: { users } });

// 1. The service entry keeps the exact instance type.
const plainEntry = drizzleService({ db: plainDb, name: "database" });
type _t1 = Expect<Equal<typeof plainEntry, typeof plainDb>>;

const schemaEntry = drizzleService({ db: schemaDb, name: "database" });
type _t2 = Expect<Equal<typeof schemaEntry, typeof schemaDb>>;

// 2. Handler context: ctx.services.<name> is the full Drizzle instance
// type — select()/from() and $client survive intact.
const app = defineApp({
  services: { database: drizzleService({ db: schemaDb, name: "database" }) },
  routes: {
    "/users": {
      GET: route<{ database: typeof schemaDb }>({
        handler: async (ctx) => {
          const pinned: typeof schemaDb = ctx.services.database;
          const rows = await ctx.services.database.select().from(users);
          const client = ctx.services.database.$client;
          type _t3 = Expect<Equal<typeof pinned, typeof schemaDb>>;
          type _t4 = Expect<Equal<typeof rows, Array<{ id: number; name: string }>>>;
          void client;
          return new Response(JSON.stringify(rows));
        },
      }),
    },
  },
});
type _app = typeof app;

// 3. The structural constraint rejects garbage at compile time.
type _t5 = Expect<Equal<{ select: Function } extends DrizzleDbLike ? false : true, true>>;
declare const garbage: { nope: 1 };
// @ts-expect-error — missing select/insert/update/delete functions
drizzleService({ db: garbage, name: "database" });
