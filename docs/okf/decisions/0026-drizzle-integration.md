---
type: Architecture Decision Record
title: 'ADR-0026 — Drizzle Integration as a Structural, Application-Owned Service Adapter'
status: accepted
tags:
- adr
- architecture
- drizzle
- services
- '0026'
generated:
  by: zcode/glm
  at: '2026-09-09T00:00:00+07:00'
---

# ADR-0026 — Drizzle Integration as a Structural, Application-Owned Service Adapter

## Status

Accepted by owner decision (ODR-0010, `docs/owner-decisions/m9-001-dispatch.md`, 2026-09-09), dispatching issue [#357](https://github.com/ther12k/lugas/issues/357) (M9-001). Fulfills the roadmap row "Drizzle ORM integration — planned optional adapter".

## Context

Lugas already exposes everything an application needs to use Drizzle today: services live in `defineApp({ services })`, `service()` (ADR-0020) attaches init/dispose lifecycle, and handlers receive typed access through `ctx.services` (ADR-0011). An application can — and after this ADR still can — simply `service({ name: "database", value: db })` with zero adapter code.

A first-party adapter is therefore justified only by what that plain composition cannot express:

- **Validation with stable diagnostics** — a mistyped or non-Drizzle object currently fails at first request (or worse, silently); Lugas rejects invalid declarations at startup the way it rejects unknown config keys.
- **Opt-in resource disposal** — closing the underlying connection is application-owned, but the *wiring* through the lifecycle contract is boilerplate every application rewrites.
- **A documented, tested composition** — the exact typing story (instance type survival into handler context) pinned by compile-time tests instead of folklore.

The zero-production-dependencies rule (package rehearsal asserts it; SBOM derives it) is a hard constraint: the adapter **must not import drizzle-orm**. Drizzle spans PostgreSQL, MySQL, SQLite, and Bun SQLite drivers; Lugas must stay driver-agnostic. Both constraints point to the same design: structural typing against the small surface the adapter actually touches.

## Decision

Lugas ships an optional subpath — `lugas/drizzle` — with a single entry point:

1. **`drizzleService({ db, name, closeOnDispose? })`** returns a `service()`-compatible descriptor for `defineApp({ services })`. Composition, not extension: the return value flows through the existing ADR-0020 lifecycle machinery unchanged (init order, drain-ordered reverse disposal, deadline invariant). Handlers access the instance through `ctx.services.<name>`; the exact Drizzle instance type survives into handler context (compile-time tested).
2. **Structural validation, no import:** the adapter declares a minimal structural interface (the CRUD method surface: `select`, `insert`, `update`, `delete` as functions) and validates the passed instance at declaration time. Failure throws `LUGAS_DRIZZLE_001`. There is no `instanceof`, no brand check, no `import "drizzle-orm"` anywhere in the package — a fake object satisfying the structure is a valid service in tests.
3. **No implicit I/O:** `init` is never set by the adapter. No connection, query, ping, or migration runs at startup, and no `migrate()` API exists in the adapter surface. A service that starts is not a service that connected.
4. **Opt-in dispose:** default dispose is a no-op (application-owned shutdown, per the roadmap). `closeOnDispose: true` wires `dispose` to call `close()` on the instance's underlying client (structural `$client` with a closable `close`); when no closable client is present, the declaration fails at startup with `LUGAS_DRIZZLE_002` rather than disposing nothing silently.
5. **No transaction abstraction:** Drizzle owns transactions and nested savepoints. The adapter exposes nothing that intercepts, wraps, or annotates them. Lugas does not become an ORM framework: schema design, migrations, transactions, pooling, tenancy, and credentials stay application-owned.
6. **Driver-agnostic by construction:** the adapter contains no driver branches. Integration tests run against Bun SQLite (`drizzle-orm/bun-sqlite`, devDependency, test/example-only); type-level tests pin instance-type survival across two distinct Drizzle db types.
7. **Packaging:** additive `"./drizzle"` export; `drizzle-orm` enters only as a devDependency. The root (`lugas`), `lugas/client`, and `lugas/testing` import graphs are unchanged; the client bundle graph check must confirm no server-side leakage.
8. **Diagnostics:** `LUGAS_DRIZZLE_001` (invalid Drizzle instance shape), `LUGAS_DRIZZLE_002` (`closeOnDispose` without a closable `$client`) — catalogued, goldens regenerated with the reason recorded.

## Consequences

- Positive: the CRUD-app story completes with lifecycle, typing, and diagnostics — without a single production dependency and without core changes.
- Positive: the adapter is ~one file plus tests; it composes `service()` instead of extending the framework.
- Cost/tradeoff: structural validation accepts any object with CRUD-shaped methods — it proves intent, not a real Drizzle instance. This is the price of the no-import rule and is documented.
- Cost/tradeoff: handler access is `ctx.services.database`, not a shorter `ctx.db` alias; see Alternatives.
- Compatibility effect: additive subpath export and one devDependency, owned by the single M9-001 issue per ODR-0010.

## Alternatives considered

- **Guard-injected `ctx.db` (`database.guard` in `before`):** rejected for this battery — it adds a per-request guard hop on every route to express what `ctx.services` already types statically, and it would normalize a second access path to the same object. Revisit if evidence shows real demand (see Revisit trigger).
- **`drizzle-orm` as a peer dependency:** rejected — peer-dependency resolution on a pre-1.0 framework adds install friction for zero adapter benefit; the structural contract is strictly weaker but dependency-free.
- **Importing drizzle-orm for `instanceof` validation:** rejected — breaks the zero-production-dependency rehearsal assertion and pins Lugas to Drizzle's packaging internals.
- **`ctx.transaction()` wrapper or unit-of-work:** rejected — Drizzle's transaction API is already explicit and typed; wrapping it adds a second vocabulary for the same semantics (ADR-0003 minimality).
- **Built-in migrations or a repository layer:** rejected — explicitly outside Lugas scope (roadmap non-goals; ODR-0010 standing non-goals).

## Evidence

Implementation issue [#357](https://github.com/ther12k/lugas/issues/357) (M9-001) delivers behavior tests (validation diagnostics, opt-in dispose over a real Bun SQLite database, lifecycle integration, fake-db replaceability), compile-time tests (instance-type survival across two Drizzle db types), a runnable example, and `docs/drizzle.md`; evidence report `docs/reports/issues/M9-001.md`.

## Revisit trigger

If the health/readiness battery (post-beta.3 sequence) needs a DB liveness probe, a small `healthCheck` option can be added to `drizzleService` with its own evidence — no silent reuse of `init`. If handler-code ergonomics demonstrably suffer, a typed context-enrichment amendment (the guard sketch) needs its own ADR amendment with per-request cost measurements.
