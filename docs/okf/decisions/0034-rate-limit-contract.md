---
type: Architecture Decision Record
title: 'ADR-0034 — Rate Limiting as a Guard Contract over Application-Owned Storage'
status: accepted
tags:
- adr
- architecture
- rate-limit
- guards
- '0034'
generated:
  by: zcode/glm
  at: '2026-09-10T00:00:00+07:00'
---

# ADR-0034 — Rate Limiting as a Guard Contract over Application-Owned Storage

## Status

Accepted by owner decision (ODR-0017, `docs/owner-decisions/m9-008-dispatch.md`, 2026-09-10), dispatching issue [#382](https://github.com/ther12k/lugas/issues/382) (M9-008). Final item of (d), the last planned battery of the ODR-0010 sequence before the owner stop-rule.

## Context

Rate limiting is the last item-(d) primitive, and it is the one where framework designs most often overreach: bundles a storage client (Redis, SQLite, an LRU cache with opinions), invents distributed coordination, or hard-codes a keying scheme that fits nobody. The failure modes are predictable — a framework-bundled in-memory counter silently stops working at two processes; a Redis dependency drags the zero-production-dependency rehearsal assertion through the floor; a fixed `req.ip` key breaks behind every proxy.

What a framework *can* own truthfully is the **contract**: what a window means, what the 429 response must carry (`Retry-After`, the IETF `RateLimit-*` fields, an RFC 9457 body), how the decision reaches handlers (standard guard enrichment), and how a key is derived from a request. The counting itself is a `get`/`increment` pair against storage the application already runs. This mirrors the structural no-import pattern of `lugas/drizzle` (ADR-0026): a minimal structural interface, validated at declaration time, with no `instanceof`, no brand, and no import of any store client.

The platform truth that makes this cheap: Lugas already has a guard pipeline with short-circuit semantics and typed enrichment merging (ADR-0012, M4R1-005). A rate limit *is* a guard — return enrichment under the limit, return a `429` Response over it. No new pipeline machinery, no wrap in the response chain, no app-level config key.

## Decision

1. **`rateLimit()` guard factory** — a first-party guard composed through the existing pipeline (`before: [rateLimit({...})]`). Ordering, short-circuit, context typing, and guard composition are already-defined framework behavior; this battery adds zero new request-path machinery.
2. **Config surface:** `limit` (positive integer), `windowMs` (positive integer), `store` (application-owned, structural), and optional `key` (`(ctx) => string`), `keyPrefix` (namespacing string), `message` (body override for the 429). Default key: the client IP when derivable from the request, else the whole-request key — applications behind proxies supply their own `key` (the framework does not guess `X-Forwarded-For` trust).
3. **Store interface (structural, no import):**
   - `get(key: string) => Promise<{ count: number; resetAt: number } | undefined>`
   - `increment(key: string, windowMs: number) => Promise<{ count: number; resetAt: number }>`
   - Implementations own expiry and durability entirely; the contract computes `resetAt` values but never touches timers. Any object satisfying the shape is valid — a hand-rolled fake in tests proves the absence of hidden coupling.
4. **Semantics (fixed window):** first hit in a window returns `count: 1`. `count <= limit` passes with enrichment `{ rateLimit: { limit, remaining, resetAt } }` — the standard guard enrichment, so handlers and later guards read remaining quota with full static typing. `count > limit` short-circuits `429` with `Retry-After` (integer seconds derived from `resetAt`, minimum 0), `RateLimit-Limit`, `RateLimit-Remaining: 0`, `RateLimit-Reset`, and an RFC 9457 Problem Details body unless `message` overrides it.
5. **`LUGAS_RATE_LIMIT_001`** on invalid configuration — non-integer or non-positive `limit`/`windowMs`, non-object store, missing `get`/`increment` functions, non-function `key`, non-string `keyPrefix` — thrown at guard construction, fail-closed like `LUGAS_COOKIE_001`. Catalogued; goldens regenerated with the reason recorded.
6. **Reference store for tests/examples only:** `createMemoryRateLimitStore()` exported from the same module, documented as non-durable and single-process. It exists so examples run and tests stay honest; production storage is the application's explicit choice. It is reference material, not the product.
7. **Packaging:** additive exports on the root entry (`rateLimit`, the store/result types, `createMemoryRateLimitStore`). No dependency changes — `package.json` and `bun.lock` remain untouched; the client and testing import graphs are unchanged.
8. **Non-goals:** bundled storage (Redis/SQLite/anything), distributed coordination, sliding-window/token-bucket algorithms (the store contract is algorithm-agnostic but this battery ships fixed-window semantics), `X-Forwarded-For` trust invention, quota policies beyond the IETF draft trio.

## Consequences

- Positive: the framework states the rate-limit truth once — 429 shape, retry information, key extraction, typed enrichment — while storage, durability, and distribution stay with the operator who actually knows their topology.
- Positive: implementation is one module plus tests; the guard pipeline carries it with no core changes.
- Cost/tradeoff: the contract ships only fixed-window semantics; sliding windows or token buckets need either a store that implements them or a future ADR widening the interface.
- Cost/tradeoff: the default key (request IP when derivable) is wrong behind proxies unless the application overrides `key` — documented, not hidden.
- Compatibility effect: additive guard factory, types, and one reference store; owned by the single M9-008 issue per ODR-0017.

## Alternatives considered

- **App-level `defineApp({ rateLimit })` policy** (like `cors`/`compression`): rejected — rate limits are per-surface decisions (login vs. read API), not app-wide response transforms; guard composition already expresses scoping precisely.
- **Bundled in-memory store as the default:** rejected — a silent default that breaks at two processes or restarts is worse than requiring the application to choose; the reference store stays opt-in and labeled.
- **Redis/`@upstash/ratelimit` integration:** rejected — dependency rule and deployment opinion; a structural interface accepts them without importing them.
- **Sliding-window/token-bucket in the contract:** rejected for this battery — the interface is deliberately minimal (`get`/`increment`); widening it needs its own evidence.
- **Trusting `X-Forwarded-For` by default:** rejected — spoofable; key derivation behind proxies is an application trust decision.

## Evidence

Implementation issue [#382](https://github.com/ther12k/lugas/issues/382) (M9-008) delivers behavior tests (limit/429/enrichment, window expiry via a fake-clock store, custom keys, prefix namespacing, guard ordering, structural fake store, config diagnostics), compile-time tests (enrichment typing into handler context), a runnable example, and `docs/rate-limit.md`; evidence report `docs/reports/issues/M9-008.md`.

## Revisit trigger

If evidenced demand appears for sliding windows, burst buckets, or distributed quota semantics, a store-interface amendment (`increment` variants or a `policy` field) needs its own ADR amendment — no silent interface drift. If handler ergonomics show applications repeatedly re-deriving proxy keys, a documented `proxyKey()` helper recipe (not a trust default) joins `docs/rate-limit.md`.
