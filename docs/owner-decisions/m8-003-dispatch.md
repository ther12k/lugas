---
type: Owner Decision Record
title: 'ODR-0009: M8-003 and M8-004 Dispatch — Structured Logging; OpenAPI 3.1 with Scalar'
status: accepted
tags:
- owner-decision
- m8
- logging
- openapi
- scalar
---

# ODR-0009: M8-003 and M8-004 Dispatch — Structured Logging; OpenAPI 3.1 with Scalar

## Context

M8-001 (CORS, PR #348) and M8-002 (SSE, PR #351) landed with complete
evidence. On 2026-09-09 the owner directed the remaining core batteries:
**structured logging** and **OpenAPI/Scalar**, in that order. This record
authorizes both milestone-8 issues and the architecture decisions behind them
([ADR-0024](../okf/decisions/0024-structured-logging.md),
[ADR-0025](../okf/decisions/0025-openapi-scalar.md)) — the latter required
because the architecture rules forbid OpenAPI work without an ADR.

## Decision

1. **M8-003 ([#352](https://github.com/ther12k/lugas/issues/352)) is
   dispatched** under ADR-0024: `defineApp({ logging })` with the scalar-only
   entry contract, pluggable sink, opt-in access facility and request ids,
   compile-boundary enforcement inside the CORS wrapper, and `LUGAS_LOG_001`.
   Access logging defaults **off** (explicit production policy), amending the
   roadmap's proposed integration default of "concise development logging" to
   "off unless configured" for this 0.x line.
2. **M8-004 is dispatched immediately after M8-003's merge** under ADR-0025:
   generation-first OpenAPI 3.1 from the prepared graph facts plus explicit
   `route({ openapi })` metadata, feature-detected Standard JSON Schema,
   presence-only fallback (never guessed shapes), RFC 9457 Problem Details as
   the documented error component, framework-compiled `/openapi.json` and
   opt-in Scalar CDN shell endpoints, and startup rejection of ownership
   conflicts. Its issue number is assigned at dispatch time.
3. **Protected-file authority (each issue for itself):** M8-003 owns
   type-only export additions to `src/index.ts`; M8-004 owns type-only export
   additions to `src/index.ts` plus the additive `route()` config key. Both:
   `package.json`, `bun.lock`, `src/client/index.ts`, `src/testing/index.ts`,
   `tsconfig*.json`, and workflows remain untouched — **zero new
   dependencies** for either battery, including Scalar (CDN shell).
4. **Boundaries unchanged:** Bun's router stays authoritative; no new route
   kinds (the OpenAPI/Scalar endpoints are framework-compiled native
   handlers); `lugas-manifest-v1` schema is frozen; no Drizzle work is started
   from either issue.

## Effect

- The M8-003 worktree may be created from a green base containing this
  record; the M8-004 worktree may be created from a green base containing
  M8-003's merge.
- On completion with full evidence, the roadmap rows "Structured logging"
  and "OpenAPI 3.1 / Scalar" flip to shipped-on-`main`; the Drizzle adapter
  remains the last planned battery.
