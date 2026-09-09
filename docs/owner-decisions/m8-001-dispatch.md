---
type: Owner Decision Record
title: 'ODR-0007: M8-001 Dispatch — First-Party CORS Policy'
status: accepted
tags:
- owner-decision
- m8
- cors
- security
---

# ODR-0007: M8-001 Dispatch — First-Party CORS Policy

## Context

M7 is complete and gated (GO, `docs/reports/gates/M7.md`); the beta line awaits
separate owner publication decisions. On 2026-09-09 the owner selected the
recommended next engineering track: begin the planned first-party batteries
(roadmap "Planned first-party batteries"), **CORS first** as the battery that
completes the browser-client story opened by ADR-0021, with SSE to follow on
the now-available lifecycle evidence. This record authorizes the first
milestone-8 issue.

## Decision

1. **M8-001 ([#346](https://github.com/ther12k/lugas/issues/346)) is
   dispatched** for implementation under
   [ADR-0022](../okf/decisions/0022-first-party-cors.md): app-level opt-in
   `defineApp({ cors })`, compile-boundary enforcement by handler/fallback
   wrapping, fail-closed defaults (`Vary: Origin` everywhere, deny without
   `Access-Control-*`, credentials/wildcard incompatibility), preflight
   interception, and startup rejection of pipeline-bypass kinds
   (`LUGAS_CORS_004`).
2. **Protected-file authority:** M8-001 owns a **type-only export addition**
   to `src/index.ts` (the `CorsConfig` family). `package.json`, `bun.lock`,
   `src/client/index.ts`, `src/testing/index.ts`, `tsconfig*.json`, and
   workflows are untouched by this issue.
3. **Boundaries unchanged:** Bun's native router stays the request-path
   router (ADR-0004) — no synthesized routes, no shadow matching;
   `lugas-manifest-v1` is not modified; no new dependencies; no later-battery
   work (SSE, OpenAPI, logging, Drizzle) is started from this issue.
4. **Naming:** issues in this batteries milestone carry the `M8` prefix;
   M8-001 is its first member.

## Effect

- The M8-001 worktree may be created from a green base containing this record
  and ADR-0022.
- On completion with full evidence, the roadmap row "CORS middleware" flips
  to Available; remaining batteries stay planned.
