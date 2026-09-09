---
type: Owner Decision Record
title: 'ODR-0010: M9-001 Dispatch — Drizzle Integration; Post-Beta.2 Battery Sequence'
status: accepted
tags:
- owner-decision
- m9
- drizzle
- services
---

# ODR-0010: M9-001 Dispatch — Drizzle Integration; Post-Beta.2 Battery Sequence

## Context

`lugas@0.1.0-beta.2` is published (`beta` dist-tag) with all four M8 batteries.
On 2026-09-09 the owner directed the next development sequence: the Drizzle
adapter first, followed by cookies/auth interoperability, WebSockets,
production HTTP hardening (secure headers, health/readiness), then
observability — with an explicit stop-rule that Lugas does not grow a large
middleware surface. Applications can already import their Drizzle instance
into a handler today, so a first-party adapter is justified only if it adds
Lugas-specific value: lifecycle, typed context, validation, diagnostics, and
replaceable-in-test ergonomics. The architecture rules require an ADR before
any ORM-adjacent work ([ADR-0026](../okf/decisions/0026-drizzle-integration.md)).

## Decision

1. **M9-001 ([#357](https://github.com/ther12k/lugas/issues/357)) is
   dispatched** under ADR-0026: an optional, driver-agnostic Drizzle
   integration under the new `lugas/drizzle` subpath. `drizzleService({
   db, name, closeOnDispose? })` composes the existing `service()` lifecycle
   and typed `ctx.services` contract; the adapter **never imports
   drizzle-orm** (structural typing; zero production dependencies preserved).
   Handler access is `ctx.services.<name>` — the ADR-0011/ADR-0020 contract —
   **not** a new `ctx.db` guard enrichment (deviation from the owner's
   illustrative sketch recorded in ADR-0026 Alternatives).
2. **Post-beta.2 sequence (owner-directed roadmap):** after M9-001, the
   intended battery order is (a) cookie primitives with an auth-interop
   recipe (Better Auth as integration example, not a first-party auth
   system), (b) WebSockets with typed upgrade guards and shutdown semantics,
   (c) secure headers and health/readiness helpers, (d) multipart uploads,
   OpenTelemetry hook surface, compression/ETag, and a rate-limit *contract*
   (storage app-owned). Each battery still requires its own issue, ADR, and
   ODR before implementation starts.
3. **First-party non-goals (standing):** JWT, password/OAuth/passkey
   authentication, email, queues, Redis/cron/S3/cache backends, GraphQL,
   payments, migrations tooling, ORM repository pattern, dependency-injection
   container. Lugas stays a focused HTTP framework; once the sequence above
   lands, the differentiator is the small API, typing, Bun-native
   performance, and release evidence — not feature count.
4. **Protected-file authority (this issue only):** M9-001 may edit
   `package.json` to add the `"./drizzle"` export and the `drizzle-orm`
   **devDependency** (test/example-only), plus `bun.lock` from the
   frozen-lockfile install; goldens regeneration via
   `scripts/update-goldens.ts --apply` with the reason recorded in the
   evidence report. `src/index.ts`, `src/client/index.ts`,
   `src/testing/index.ts`, `tsconfig*.json`, and workflows remain untouched —
   the subpath is additive and the root import graph does not change.

## Effect

- The M9-001 worktree may be created from a green base containing this
  record.
- On completion with full evidence, the roadmap row "Drizzle ORM
  integration" flips to shipped-on-`main`, and the planned-batteries section
  is reduced to the sequence in Decision 2.
- npm publication, dist-tag moves, and any new release candidate remain
  owner-controlled actions.
