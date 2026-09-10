---
type: Owner Decision Record
title: 'ODR-0017: M9-008 Dispatch — Rate-Limit Contract'
status: accepted
tags:
- owner-decision
- m9
- rate-limit
- guards
---

# ODR-0017: M9-008 Dispatch — Rate-Limit Contract

## Context

The M9-007 compression/ETag battery is merged on green `main` (`1834aab`). Per
the owner-directed sequence (ODR-0010), item (d) closes with the rate-limit
*contract* — the last planned battery before the owner's stop-rule. Every
framework that bundles rate-limit storage eventually lies about it (in-memory
counters die at two processes; store clients drag in dependencies). Lugas owns
the semantics — window accounting, the 429 shape with `Retry-After` and
`RateLimit-*` fields, key extraction, typed enrichment — while storage stays
application-owned behind a structural interface, the proven `lugas/drizzle`
pattern (ADR-0026). [ADR-0034](../okf/decisions/0034-rate-limit-contract.md)
fixes the contract.

## Decision

1. **M9-008 ([#382](https://github.com/ther12k/lugas/issues/382)) is
   dispatched** under ADR-0034: a first-party `rateLimit()` guard factory
   composed through the existing guard pipeline — `limit`/`windowMs`/`store`
   plus optional `key`/`keyPrefix`/`message`; fixed-window semantics;
   under-limit passes with `{ rateLimit: { limit, remaining, resetAt } }`
   enrichment; over-limit short-circuits 429 with `Retry-After`,
   `RateLimit-Limit`, `RateLimit-Remaining: 0`, `RateLimit-Reset`, and an
   RFC 9457 body (overridable via `message`).
2. **Storage is application-owned, structurally typed, and never imported:**
   `get(key)`/`increment(key, windowMs)` with implementations owning expiry.
   `createMemoryRateLimitStore()` ships as a documented non-durable
   single-process *reference* for tests/examples — not a product, not a
   default. No Redis, no SQLite, no bundled store; `package.json` and
   `bun.lock` remain **untouched**.
3. **Sequence closure:** M9-008 is the final battery of item (d) and of the
   ODR-0010 post-beta.3 sequence. On merge, feature development **stops**
   per the owner's stop-rule; remaining work goes to the beta.4 release
   candidate (owner-gated publish) and stability preparation. ADR-0031 (MCP
   adapter) remains parked pending owner decision.
4. **Protected-file authority (this issue only):** M9-008 may edit
   `src/index.ts` (protected) for the additive export lines (`rateLimit`,
   store/result types, `createMemoryRateLimitStore`). No other protected
   files: `package.json`, `bun.lock`, `src/client/index.ts`,
   `src/testing/index.ts`, `tsconfig*.json`, and workflows remain
   untouched. Diagnostics goldens regenerate via
   `scripts/update-goldens.ts --apply` with the reason recorded in the
   evidence report.

## Effect

- The M9-008 worktree may be created from a green base containing this
  record (`docs/m9-008-governance` merge).
- On completion with full evidence, the roadmap's observability row closes
  (no remaining item-(d) work), `docs/rate-limit.md` joins the synced site
  pages, and the ODR-0010 battery sequence is complete.
- npm publication, dist-tag moves, and the beta.4 release candidate remain
  owner-controlled actions.
