---
type: Owner Decision Record
title: 'ODR-0015: M9-006 Dispatch — Dependency-Free Telemetry Hooks'
status: accepted
tags:
- owner-decision
- m9
- telemetry
- opentelemetry
---

# ODR-0015: M9-006 Dispatch — Dependency-Free Telemetry Hooks

## Context

The M9-005 multipart battery is merged on green `main` (`9760281`). Per the
owner-directed sequence (ODR-0010), item (d) continues with OpenTelemetry
integration hooks — explicitly **not** an SDK dependency: applications that
adopt `@opentelemetry/api` get correct spans; everyone else gets zero new
weight. What raw composition cannot express is the request-end boundary that
includes `track()`-registered work and the error-class attribution — both are
framework truths already defined by ADR-0020/ADR-0024.
[ADR-0032](../okf/decisions/0032-telemetry-hooks.md) fixes the contract.

## Decision

1. **M9-006 ([#376](https://github.com/ther12k/lugas/issues/376)) is
   dispatched** under ADR-0032: `defineApp({ telemetry: { onRequestStart?,
   onRequestEnd? } })` — two explicit scalar-only callbacks receiving
   `request.start` (method, path, route, requestId when logging.requestIds
   is on) and `request.end` (adds status, durationMs, errorClass), with
   request-end defined as response-produced **and** tracked-work-settled
   (correlation via a plain token passed to `track()`). The OpenTelemetry
   adapter (`toOpenTelemetry()` mapping events onto spans) ships as a tested
   recipe in `docs/telemetry.md` — `@opentelemetry/api` enters as a
   devDependency only (test/example), mirroring the ADR-0026 drizzle-orm
   pattern. No exporter, no propagation, no async-context globals.
2. **Sequence confirmation:** the remaining item-(d) batteries are
   compression/ETag and the rate-limit contract (storage app-owned) — each
   still requiring its own issue, ADR, and ODR before implementation. After
   item (d) closes, feature development stops per the owner's stop-rule and
   the project prepares for stability (the ADR-0031 MCP proposal remains
   parked pending owner decision).
3. **Protected-file authority (this issue only):** M9-006 may edit
   `src/index.ts` (protected) for the additive type-export lines, plus
   `src/internal/serve.ts`, `src/internal/prepared-app.ts`,
   `src/internal/logging.ts`, and `src/internal/lifecycle.ts` as adjacent
   owned-by-this-issue files (the telemetry wrap composes with logging and
   the track/drain boundary; all changes additive, existing behavior
   unchanged and covered by the full suite). `package.json` and `bun.lock`
   may add **only** the `@opentelemetry/api` devDependency (test/example —
   never a runtime dependency; package rehearsal's zero-dependency assertion
   must stay green). `src/client/index.ts`, `src/testing/index.ts`,
   `tsconfig*.json`, and workflows remain untouched. Diagnostics goldens
   regenerate via `scripts/update-goldens.ts --apply` with the reason
   recorded in the evidence report.

## Effect

- The M9-006 worktree may be created from a green base containing this
  record (`docs/m9-006-governance` merge).
- On completion with full evidence, the roadmap's OTel-hooks row flips to
  shipped-on-`main`, and `docs/telemetry.md` joins the synced site pages.
- npm publication, dist-tag moves, and any new release candidate remain
  owner-controlled actions.
