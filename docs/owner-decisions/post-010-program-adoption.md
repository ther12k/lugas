---
type: Owner Decision Record
title: 'ODR-0019: Post-0.1.0 Program Adoption — The Application Framework for Bun'
status: accepted
tags:
- owner-decision
- program
- fetch-interface
- bridges
- positioning
- stop-rule
---

# ODR-0019: Post-0.1.0 Program Adoption — The Application Framework for Bun

## Context

With the M9-GATE closed and `0.1.0-beta.4` published
([ODR-0018](m9-gate-closure.md), 2026-09-11), the owner reviewed a strategic
assessment of the project's identity: the shipped surface already constitutes
a complete application layer on Bun, and the missing piece is the integration
boundary above it — an in-process fetch-shaped entry, first-class bridges to
the frontend ecosystem (TanStack Start, SvelteKit), Bun-native service
adapters, deeper observability, and scaffolding. The owner accepted the
direction with explicit modifications on 2026-09-11: the stabilization
stop-rule is not weakened; the fetch contract is named the Application Fetch
Interface with a pipeline-equivalence invariant; `create-lugas` precedes the
Bun-native service adapters; and OpenTelemetry is a successor architecture
program rather than an adapter task.

## Decision

1. **Direction adopted.** "The application framework for Bun" is the
   post-0.1.0 product direction. Positioning pillars: **Explicit** (no hidden
   DI, no generated magic), **Typed** (wire-honest server→client semantics),
   **Integrated** (Bun plus frontend hosts plus ecosystem tools without
   per-project glue), **Evidenced** (compatibility claims mechanically
   verified).
2. **ODR-0018 is not superseded.** Through 0.1.0 stabilization:
   architecture/design documentation may be prepared; compatibility
   requirements may be specified; implementation remains prohibited except
   under the ODR-0018 lanes (fixes, documentation, evidence upkeep, release
   engineering). Deciding now is what keeps the later roadmap from
   destabilizing what ships now.
3. **ADR-0035 (Application Fetch Interface) is created now as design
   documentation**, status Proposed
   ([`docs/okf/decisions/0035-application-fetch-interface.md`](../okf/decisions/0035-application-fetch-interface.md)).
   Owner-directed pins: `app.fetch(request: Request)`; the MUST invariant
   that `fetch()` and `serve()` execute the same route pipeline with
   equivalent HTTP semantics; host-owned lifecycle; standard
   `Request`/`Response` with `Request.url` authoritative (no prefix
   awareness, no `LugasRequest`); an explicit fetch-boundary vs
   upgrade-boundary split for WebSocket (bridges advertise "depends on
   host", never transparent portability); certified per-capability bridge
   evidence. Acceptance and dispatch occur after 0.1.0.
4. **Program sequence after 0.1.0** (concrete milestone IDs assigned at
   dispatch; the M1–M9 namespace is historical):
   - Phase 1 — Application Fetch Interface implementation; TanStack Start
     bridge; SvelteKit bridge; the certified compatibility matrix
     (CI-generated, per-capability, with run provenance).
   - Phase 2 — `create-lugas` (second package per item 5), TanStack/Svelte/
     API-only starters, deployment reference applications.
   - Phase 3 — Bun-native structural service adapters (`sqlService`,
     `redisService`, `s3Service`) reusing the ADR-0026 precedent exactly:
     type preservation, lifecycle, health/readiness wiring, test
     substitution, observability metadata — never a wrapper API over
     `Bun.sql`/`Bun.redis`/`Bun.s3`, no per-route injection syntax.
   - Phase 4 — OpenTelemetry successor architecture: distinguish the existing
     generic hooks (Level 1) from an instrumentation surface (Level 2);
     investigate an internal instrumentation interface — not ten public
     lifecycle events, which would permanently couple the public contract to
     tracing internals — before freezing an ADR; ADR-0032's non-goals are
     amended explicitly at that time.
5. **Packaging direction (ADR-0012 amendment to land with the Phase-2
   dispatch).** Runtime/library integrations remain in-package subpaths
   (`lugas/tanstack-start`, `lugas/sveltekit`, `lugas/opentelemetry`, …) per
   the ADR-0026 structural-adapter precedent. `create-lugas` is a justified
   second package on deployment-boundary grounds: it executes before the
   target application has Lugas installed and carries CLI dependencies,
   template assets, and an independent release cadence. No `@lugas/*` package
   split absent measured packaging problems.
6. **Standing non-goals interpretation.** The first-party non-goals list
   (including "Redis/cron/S3/cache backends") is unchanged through 0.1.0.
   Recorded interpretation: the list excludes first-party backend
   *implementations*; structural adapters over application-owned clients are
   the established pattern (ADR-0026 coexists with the ORM-repository-pattern
   non-goal). The formal wording clarification lands with the Phase-3 ADR.
7. **`docs/choosing-lugas.md` corrected immediately** under the ODR-0018
   documentation lane: the "choose Elysia" rows referencing WebSocket
   support, schema-generated OpenAPI, and framework-level lifecycle hooks are
   stale — all three shipped through M9 (ADR-0025/ADR-0028; service
   lifecycle; telemetry hooks).

## Effect

- Nothing in the shipped `0.1.0-beta.4` surface changes; the ODR-0018
  stop-rule stays intact and M10 stabilization continues.
- `docs/okf/decisions/0035-application-fetch-interface.md` exists as
  Proposed; `docs/open-decisions.md` carries its register row; the roadmap
  gains a Post-0.1.0 program section pointing at this record.
- The next owner actions are unchanged: 0.1.0 stabilization, optional
  dist-tag follow-ups.
