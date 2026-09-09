/**
 * M9-001 — `lugas/drizzle` behavior contract (ADR-0026).
 *
 * Pinned contract: `drizzleService` composes the existing `service()`
 * lifecycle, validates the structural CRUD surface at declaration time
 * (`LUGAS_DRIZZLE_001`), wires opt-in disposal through the structural
 * `$client.close()` (`LUGAS_DRIZZLE_002` when absent), performs no implicit
 * I/O, never wraps transactions, and accepts structural fakes — the adapter
 * imports nothing from drizzle-orm.
 */
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { sql } from "drizzle-orm";

import { defineApp, json, route, service } from "../../src";
import { drizzleService } from "../../src/drizzle";
import * as adapter from "../../src/drizzle";
import { createTestServer } from "../../src/testing";

function expectCode(run: () => unknown, code: string): void {
  try {
    run();
  } catch (error) {
    expect((error as { code?: string }).code).toBe(code);
    return;
  }
  throw new Error(`expected drizzleService() to throw ${code}`);
}

function makeDb(path = ":memory:") {
  const sqlite = new Database(path);
  sqlite.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");
  sqlite.run("INSERT INTO users (name) VALUES ('ada'), ('grace')");
  return { sqlite, db: drizzle(sqlite) };
}

describe("M9-001 drizzleService declaration diagnostics", () => {
  test("valid drizzle instance passes; the service value is the instance itself", () => {
    const { db } = makeDb();
    const entry = drizzleService({ db, name: "database" });
    // `service()` returns T at the type level; at runtime it is the frozen
    // lifecycle descriptor the app preparer detects and unwraps.
    expect((entry as unknown as { value: unknown }).value).toBe(db);
    expect(typeof (entry as unknown as { value: { $client: { close: unknown } } }).value.$client.close).toBe("function");
  });

  test("non-object config and missing/shape-broken db fail with LUGAS_DRIZZLE_001", () => {
    expectCode(() => drizzleService(undefined as never), "LUGAS_DRIZZLE_001");
    expectCode(() => drizzleService(null as never), "LUGAS_DRIZZLE_001");
    expectCode(() => drizzleService({ name: "database" } as never), "LUGAS_DRIZZLE_001");
    expectCode(() => drizzleService({ db: null, name: "database" } as never), "LUGAS_DRIZZLE_001");
    expectCode(
      () =>
        drizzleService({
          db: { select: 1, insert: () => ({}), update: () => ({}), delete: () => ({}) },
          name: "database",
        } as never),
      "LUGAS_DRIZZLE_001",
    );
    expectCode(
      () => drizzleService({ db: { insert: () => ({}), update: () => ({}), delete: () => ({}) }, name: "database" } as never),
      "LUGAS_DRIZZLE_001",
    );
  });

  test("structural fakes are valid — no instanceof or drizzle-orm coupling", () => {
    const fake = {
      select: () => ({}),
      insert: () => ({}),
      update: () => ({}),
      delete: () => ({}),
    };
    const entry = drizzleService({ db: fake, name: "fake-db" });
    expect((entry as unknown as { value: unknown }).value).toBe(fake);
  });

  test("closeOnDispose without a closable $client fails with LUGAS_DRIZZLE_002", () => {
    const fake = {
      select: () => ({}),
      insert: () => ({}),
      update: () => ({}),
      delete: () => ({}),
    };
    expectCode(() => drizzleService({ db: fake, name: "database", closeOnDispose: true }), "LUGAS_DRIZZLE_002");
    expectCode(
      () => drizzleService({ db: { ...fake, $client: {} }, name: "database", closeOnDispose: true }),
      "LUGAS_DRIZZLE_002",
    );
    expectCode(
      () => drizzleService({ db: { ...fake, $client: { close: "no" } }, name: "database", closeOnDispose: true } as never),
      "LUGAS_DRIZZLE_002",
    );
    expectCode(
      () => drizzleService({ db: drizzle(new Database(":memory:")), name: "database", closeOnDispose: "yes" } as never),
      "LUGAS_DRIZZLE_002",
    );
  });
});

describe("M9-001 no implicit I/O and no transaction surface", () => {
  test("drizzleService never sets init — no connection, ping, or migration at startup", () => {
    const { db } = makeDb();
    const descriptor = drizzleService({ db, name: "database", closeOnDispose: true }) as unknown as {
      init: unknown;
      dispose: unknown;
    };
    expect(descriptor.init).toBeUndefined();
    expect(typeof descriptor.dispose).toBe("function");
  });

  test("the adapter surface exposes no migrate API and nothing but drizzleService", () => {
    expect("migrate" in adapter).toBe(false);
    expect(Object.keys(adapter).sort()).toEqual(["drizzleService"]);
  });
});

describe("M9-001 drizzle-backed routes and lifecycle", () => {
  test("handlers reach the live instance through ctx.services and query real rows", async () => {
    const { db } = makeDb();
    const app = defineApp({
      services: { database: drizzleService({ db, name: "database" }) },
      routes: {
        "/users": {
          GET: route<{ database: typeof db }>({
            handler: async (ctx) => {
              const rows = await ctx.services.database.all<{ id: number; name: string }>(
                sql`SELECT id, name FROM users ORDER BY id`,
              );
              return json(200, rows);
            },
          }),
        },
      },
    });

    const server = createTestServer(app, { port: 0 });
    try {
      const response = await server.fetch("/users");
      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ name: string }>;
      expect(body.map((row) => row.name)).toEqual(["ada", "grace"]);
    } finally {
      await server.stop();
    }
  });

  test("default dispose is a no-op — the database stays usable after graceful shutdown", async () => {
    const { sqlite, db } = makeDb();
    const app = defineApp({
      services: { database: drizzleService({ db, name: "database" }) },
      routes: { "/ping": { GET: new Response("ok") } },
    });
    const server = app.serve({ port: 0, development: false });
    await server.lugasLifecycle.ready;
    // No connections were ever opened; graceful stop drains and disposes.
    await server.lugasLifecycle.shutdown();
    // Application-owned shutdown: the connection is intentionally untouched.
    expect(sqlite.query("SELECT 40 + 2 AS v").get()).toEqual({ v: 42 });
  });

  test("closeOnDispose: true closes the underlying database during graceful shutdown", async () => {
    const { sqlite, db } = makeDb();
    const app = defineApp({
      services: { database: drizzleService({ db, name: "database", closeOnDispose: true }) },
      routes: { "/ping": { GET: new Response("ok") } },
    });
    const server = app.serve({ port: 0, development: false });
    await server.lugasLifecycle.ready;
    await server.lugasLifecycle.shutdown();
    // Drain-ordered disposal closed the underlying sqlite database.
    expect(() => sqlite.query("SELECT 1").get()).toThrow();
  });

  test("lifecycle integration: declaration-order init, reverse-order disposal around the drizzle service", async () => {
    const { db } = makeDb();
    const events: string[] = [];

    const app = defineApp({
      services: {
        database: drizzleService({ db, name: "database" }),
        audit: service({
          name: "audit",
          value: {},
          init: () => {
            // Runs after `database` (declaration order); the drizzle service
            // is live for later inits by the ADR-0020 contract.
            events.push("audit:init");
          },
          dispose: () => {
            events.push("audit:dispose");
          },
        }),
      },
      routes: {
        "/users": {
          GET: route<{ database: typeof db }>({
            handler: async (ctx) => {
              const rows = await ctx.services.database.all<{ name: string }>(sql`SELECT name FROM users ORDER BY id`);
              return json(200, rows);
            },
          }),
        },
      },
    });

    const server = app.serve({ port: 0, development: false });
    // Init runs before any traffic; with zero connections the graceful stop
    // drains immediately and disposal runs in reverse initialization order.
    await server.lugasLifecycle.ready;
    await server.lugasLifecycle.shutdown();
    expect(events).toEqual(["audit:init", "audit:dispose"]);
  });
});
