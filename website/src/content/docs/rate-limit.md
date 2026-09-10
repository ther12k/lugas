---
title: "Rate limiting"
description: "Fixed-window guard semantics over application-owned storage."
---
`rateLimit()` is a first-party guard factory that caps how often a route admits requests: under the limit requests pass through with remaining-quota enrichment; over the limit they short-circuit with a truthful `429`. The framework owns the *semantics* — fixed-window accounting, the `Retry-After` and `RateLimit-*` response fields, the RFC 9457 error body, key extraction, and typed enrichment — while **storage stays application-owned** behind a two-method structural interface. No Redis client, no SQLite, no bundled store: anything that can count and expire works. See [ADR-0034](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0034-rate-limit-contract.md).

## Quick start

```ts
import { defineApp, json, rateLimit, route } from "lugas";
import { createMemoryRateLimitStore } from "lugas";
import { RedisStore } from "./my-redis-store";   // your code, your client

const store = new RedisStore();                  // application-owned storage

export default defineApp({
  routes: {
    "/login": {
      POST: route({
        before: [rateLimit({ limit: 5, windowMs: 60_000, store, keyPrefix: "login:" })],
        handler: (ctx) => json(200, { ok: true }),
      }),
    },
  },
});
```

Because it is an ordinary guard, everything about guards already applies: ordering, short-circuiting, enrichment merging, and full static typing of `ctx.rateLimit`.

## Configuration

| Option | Type | Meaning |
|---|---|---|
| `limit` | positive integer | The limit-th request in a window is the last admitted one. |
| `windowMs` | positive integer | Fixed-window length in milliseconds. |
| `store` | `RateLimitStore` | Application-owned counting store (below). |
| `key` | `(ctx) => string` | Bucket key extractor. See [Keying](#keying). |
| `keyPrefix` | `string` | Namespace prepended to keys — separates apps sharing one store. |
| `message` | `string` | Replaces the default RFC 9457 body of the 429 (sent as `text/plain`). |

Invalid configuration throws `LUGAS_RATE_LIMIT_001` at guard construction — the same fail-closed contract as `cookie()`.

## The store contract

The store is structural: no import, no `instanceof`, no brand. Any object with these two async methods satisfies it:

```ts
type RateLimitSnapshot = { count: number; resetAt: number };

interface RateLimitStore {
  get(key: string): Promise<RateLimitSnapshot | undefined>;
  increment(key: string, windowMs: number): Promise<RateLimitSnapshot>;
}
```

- A **first hit in a fresh window** returns `count: 1`.
- `resetAt` is **epoch milliseconds** — the window's expiry, computed by the store. The framework never touches timers; expiry and durability are entirely the store's business.
- A Redis `INCR` + `PEXPIRE`, a Postgres upsert, a queue-backed counter, a single-process `Map` — all are valid implementations.

`createMemoryRateLimitStore()` ships as a **reference** implementation for tests, examples, and single-process development. It is not durable, not shared across workers, and unbounded — production deployments bring their own store.

## Semantics

- **Under the limit** the guard enriches the context:

  ```ts
  ctx.rateLimit // { limit: 5, remaining: 3, resetAt: 1760000000000 }
  ```

  The typing flows through normal guard composition — handlers and later guards see `rateLimit` statically.

- **Over the limit** the guard short-circuits with a native `429` response:

  | Header | Value |
  |---|---|
  | `Retry-After` | Seconds until the window resets (minimum 0). |
  | `RateLimit-Limit` | The configured limit. |
  | `RateLimit-Remaining` | `0`. |
  | `RateLimit-Reset` | Seconds until reset (matches `Retry-After`). |

  The default body is RFC 9457 Problem Details (`application/problem+json`) with type `https://lugasjs.dev/problems/rate-limited`; `message` replaces it.

## Keying

The **default key is the whole-request key**: without a `key` function, every request shares one bucket per `keyPrefix`. Lugas guards see only the `Request` object and do not guess proxy headers — deriving a client identity is an explicit application decision:

```ts
// Per API key (header-based clients)
rateLimit({
  limit: 100,
  windowMs: 60_000,
  store,
  key: (ctx) => ctx.request.headers.get("x-api-key") ?? "anon",
});

// Behind a proxy that sets a trusted header (you own the trust decision)
rateLimit({
  limit: 30,
  windowMs: 60_000,
  store,
  key: (ctx) => ctx.request.headers.get("x-real-ip") ?? "unknown",
});
```

A spoofable `X-Forwarded-For` is deliberately never read by default.

## Ordering is scoping

Declared **after** an auth guard, only authenticated requests consume quota (failed auth short-circuits before counting). Declared **before**, all traffic counts — useful for shielding expensive credential checks from brute force:

```ts
before: [rateLimit({ limit: 10, windowMs: 60_000, store, keyPrefix: "login:" }), authenticate],
```

Two `rateLimit()` guards on the same route collide on the `rateLimit` enrichment key and fail closed (LUGAS_GUARD_007) — declare one limiter per route, or scope by `keyPrefix` across routes.

## Fixed windows

This battery ships fixed-window semantics: a window starting at the first hit, hard reset at `resetAt`. Clients can observe a 2× burst across a window boundary (limit at the end of one window + limit at the start of the next). The store contract is deliberately algorithm-agnostic; sliding windows or token buckets would be a store-side or future-ADR concern, not an interface change smuggled in.

## Diagnostics

| Code | Meaning |
|---|---|
| `LUGAS_RATE_LIMIT_001` | Invalid `rateLimit()` configuration (non-integer/non-positive `limit`/`windowMs`, store missing `get`/`increment`, non-function `key`, non-string `keyPrefix`/`message`, unknown keys). |

## Runnable example

[`examples/rate-limit/`](https://github.com/ther12k/lugas/tree/main/examples/rate-limit) — two routes over one shared store with per-route prefixes, observable 429s with `Retry-After`.
