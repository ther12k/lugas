---
type: Owner Decision Record
title: 'ODR-0013: M9-004 Dispatch — Secure Headers and Health/Readiness Endpoints'
status: accepted
tags:
- owner-decision
- m9
- security
- health
---

# ODR-0013: M9-004 Dispatch — Secure Headers and Health/Readiness Endpoints

## Context

The M9-003 WebSockets battery is merged on green `main` (`4d08696`). Per the
owner-directed post-beta.2 sequence (ODR-0010), item (c) is production
hardening: secure headers — explicitly **without** an invented strict
Content-Security-Policy — and health/readiness helpers over the ADR-0020
service lifecycle. Raw composition cannot express either framework-honestly:
per-route header snippets cannot guarantee a baseline, and the
liveness/readiness distinction is precisely which side of the traffic gate an
endpoint sits on. [ADR-0029](../okf/decisions/0029-production-hardening.md)
fixes the contract.

## Decision

1. **M9-004 ([#369](https://github.com/ther12k/lugas/issues/369)) is
   dispatched** under ADR-0029 as **one battery** shipping both helpers:
   `secureHeaders` (conservative defaults — `nosniff`, `X-Frame-Options:
   DENY`, `Referrer-Policy: strict-origin-when-cross-origin` — fill-if-absent;
   CSP strictly opt-in; HSTS opt-in) and `health` (`/health` liveness
   bypassing the gate; `/ready` readiness awaiting it; renamable paths;
   startup collision checks). No per-dependency probes, no CSP builder, no
   deprecated headers (`X-XSS-Protection` stays out).
2. **Sequence confirmation:** after M9-004, the remaining planned batteries
   are (d) multipart with bounded consumption, OpenTelemetry hook surface,
   compression/ETag, and the rate-limit contract (storage app-owned) — each
   requiring its own issue, ADR, and ODR before implementation starts. Per
   the owner's stop-rule, once these land the differentiator is the small
   API, typing, Bun-native performance, and release evidence — not feature
   count.
3. **Protected-file authority (this issue only):** M9-004 may edit
   `src/index.ts` (protected) for the additive config-type export lines.
   `src/internal/serve.ts` and `src/internal/prepared-app.ts` remain
   adjacent owned-by-this-issue for wrapper/mount wiring (all changes
   additive; existing behavior unchanged and covered by the full suite).
   `package.json` and `bun.lock` must remain **untouched** (no dependencies);
   `src/client/index.ts`, `src/testing/index.ts`, `tsconfig*.json`, and
   workflows remain untouched. Diagnostics goldens regenerate via
   `scripts/update-goldens.ts --apply` with the reason recorded in the
   evidence report.

## Effect

- The M9-004 worktree may be created from a green base containing this
  record (`docs/m9-004-governance` merge).
- On completion with full evidence, the roadmap's item (c) flips to
  shipped-on-`main`, and `docs/production.md` joins the synced site pages.
- npm publication, dist-tag moves, and any new release candidate remain
  owner-controlled actions.
