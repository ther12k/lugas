---
type: Guide
title: Services and Lifecycle
status: current
tags:
- guide
- services
- lifecycle
---

# Services and lifecycle

`defineApp({ services })` is the dependency surface of an application: one flat object of named values that handlers and guards close over. There is no DI container, no injection decorators, no resolution graph — you construct your dependencies, you pass them in, Lugas types the access.

## Plain services

Any value in the map is available as-is. Handler access to `ctx.services` is typed explicitly: pass a services type parameter to `route()` (`route<{ db: typeof db }>({ … })`) when the route declares nothing else, or use a narrow local cast when the route also declares schemas — schema slots occupy `route()`'s other type parameters (tracked as dogfood finding RF-1, `docs/reports/dogfood-realworld-findings.md`):

```ts
import { defineApp, route, json } from "lugas";

const db = createDb();                 // your construction, your version
const mailer = createMailer(process.env.SMTP_URL);

type Services = { db: typeof db; mailer: ReturnType<typeof createMailer> };

export default defineApp({
  services: { db, mailer },
  routes: {
    "/users/:id": {
      GET: route({
        handler: async (ctx) => {
          const { db } = ctx.services as Services;
          const user = await db.users.find(ctx.params.id);
          return user ? json(200, user) : json(404, { error: "not found" });
        },
      }),
    },
  },
});
```

Plain values are **live references**: never initialized or disposed by the framework. That is the default on purpose — Lugas adds nothing you did not ask for.

## Lifecycle services

`service()` attaches `init`/`dispose` behavior to one entry (ADR-0020):

```ts
import { defineApp, service } from "lugas";

export default defineApp({
  services: {
    db: service({
      name: "db",
      value: createDb(),
      init: async (db) => { await db.connect(); },
      dispose: async (db) => { await db.close(); },
    }),
    cache: service({
      name: "cache",
      value: createCache(),
      // init/dispose are optional and independent
      dispose: async (cache) => { await cache.flush(); },
    }),
  },
});
```

| Key | Purpose |
|---|---|
| `name` | Stable identity (must match the map key's intent; appears in diagnostics). |
| `value` | The live dependency itself — the exact instance your code uses. |
| `init` | Async setup, run at **serve time** in declaration order (map key order). |
| `dispose` | Async teardown, run at shutdown in **reverse** order. |

## Startup: the traffic gate

`init` runs when the server starts, and **no Lugas handler executes before every `init` has settled**. Requests arriving during startup are held, not rejected.

- A startup failure disposes already-initialized services in reverse and surfaces through `server.lugasLifecycle.ready` (a rejected promise) plus a redacted `503` on held routes. Failures fail closed and leave no half-initialized app.
- `await server.lugasLifecycle.ready` in your entrypoint when you want to gate readiness explicitly.

## Shutdown: drain, then dispose

`server.lugasLifecycle.shutdown()` is idempotent and runs three phases:

1. **Stop accepting** new connections.
2. **Drain** in-flight requests and work registered through `track()` — bounded by a deadline (`serve({ shutdown: { drainDeadlineMs } })`, default 10 seconds).
3. **Dispose** services in reverse declaration order.

Three outcomes are reported distinctly (`connectionsClosed`, `trackedWorkCompleted`, `disposalCompleted`, plus `disposalFailures`) — the outcome object is honest rather than boolean.

**Deadline invariant:** when the deadline expires with work still running, the outcome is explicitly unsuccessful (`cooperated: false`, `deadlineExpired: true`); connections are force-closed but services that may still be in use are **not disposed** — continuing work observes an intact resource, never fabricated success. Work you detach from `track()` is yours.

```ts
const server = app.serve({
  port: 3000,
  shutdown: {
    drainDeadlineMs: 5_000,
    signals: true,          // opt-in SIGINT/SIGTERM → same shutdown path
  },
});
```

Signals are strictly opt-in: importing Lugas installs no handlers and never exits your process. Native route values (plain functions, `Response`, `Bun.file`, `{ dir}`) and asset routes bypass the pipeline and are therefore not lifecycle-gated.

## The Drizzle adapter

`lugas/drizzle` is a thin, typed composition over `service()` for Drizzle ORM instances: structural startup validation, the exact instance type on `ctx.services`, and opt-in disposal through the client. It never imports `drizzle-orm` — see [`drizzle.md`](./drizzle.md). Plain `service()` remains the general answer for every other dependency kind.

## What services are not

- **Not a locator**: nothing resolves strings to dependencies at runtime; context typing is static.
- **Not a scope system**: no per-request scopes; pass request data through guards/context, not through services.
- **Not a module property**: services belong to the app; modules are only named route bags ([routing](./routing.md)).

## Where next

- [Lifecycle details](./api-reference.md#service-lifecycle-adr-0020) — the full shutdown outcome contract.
- [Testing](./testing.md) — replacing services with fakes and asserting disposal.
- [Diagnostics](./diagnostics.md) — the `LUGAS_*` codes a lifecycle failure can raise.
