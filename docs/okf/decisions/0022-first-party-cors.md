---
type: Architecture Decision Record
title: ADR-0022 — First-Party CORS Policy Enforced at the Compile Boundary
status: accepted
tags:
- adr
- architecture
- cors
- security
- '0022'
generated:
  by: zcode/glm
  at: '2026-09-09T00:00:00+07:00'
---

# ADR-0022 — First-Party CORS Policy Enforced at the Compile Boundary

## Status

Accepted by owner decision (ODR-0007, `docs/owner-decisions/m8-001-dispatch.md`, 2026-09-09), dispatching issue [#346](https://github.com/ther12k/lugas/issues/346) (M8-001) as the first milestone-8 battery. Fulfills the roadmap row "CORS middleware — planned first-party integration".

## Context

A browser frontend on a different origin cannot read Lugas responses without CORS headers, so every real cross-origin deployment needs this policy — and it pairs directly with the prebuilt browser client artifact ([ADR-0021](0021-prebuilt-browser-client-artifact.md)). The roadmap pre-commits the safety posture: **no cross-origin access unless the application explicitly enables it**, and never a permissive wildcard default.

Two architecture facts constrain the design:

1. **Bun's native router is authoritative** ([ADR-0004](0004-bun-native-router-authoritative.md)) and offers no global request middleware. The framework's leverage point is that `defineApp()` compiles the route map before `Bun.serve` ever sees it — every handler the router can dispatch is a function Lugas produced or passed through.
2. Pinned-oracle probe (Bun 1.4.0): a request whose method is not declared on a matching path (including CORS preflights) falls through to the server-level `fetch` fallback; path-level any-method entries receive `OPTIONS` directly; `HEAD` is auto-derived from `GET`. Preflight handling therefore has exactly three entry points — declared `OPTIONS` handlers, any-method entries, and the `fetch` fallback — all of them functions Lugas can wrap.

A separate class of route values bypasses the response pipeline entirely: static `Response` objects, `Bun.file()`/`Blob` values, native `{ dir }` mounts, and ADR-0018 assets. Their bodies cannot be safely re-wrapped per request (single-consumption streams; native file semantics), so headers cannot be enforced on them without either losing native serving behavior or guessing at replay semantics.

## Decision

Lugas ships a **first-party, app-level, opt-in CORS policy** enforced at the compile boundary:

1. **Configuration surface:** `defineApp({ cors })` with `origin`, `methods`, `allowedHeaders`, `exposedHeaders`, `credentials`, `maxAge`. Absent `cors`, behavior is byte-identical to today — no headers, no fallback changes.
2. **Origin decisions, fail-closed:** `origin` is an exact origin string, an allowlist array (no mixing `"*"` with concrete origins), or a callback `(origin, request) => boolean | string` (sync or async). `true` echoes the request origin; a string echoes that canonical origin; `false` or an absent `Origin` header means **no** `Access-Control-*` headers. Wildcard `"*"` is incompatible with `credentials: true` — rejected at startup for static configuration, denied at runtime for wildcard callback results.
3. **Enforcement points:** every compiled handler function (Lugas descriptors and native function handlers, path-level and per-method) and the serve-time `fetch` fallback (including a user-supplied `fetch`) is wrapped once during preparation. The wrapper is the outermost layer, so traffic-gate `503`s, `onError` `500`s, and not-found `404`s all receive the policy. No routes are synthesized and no path matching is reimplemented — preflights that match no declared `OPTIONS`/any-method entry reach the fallback wrapper by Bun's own routing.
4. **Preflight:** `OPTIONS` requests carrying `Access-Control-Request-Method` are intercepted before user `OPTIONS` handlers and answered `204` with the header set for allowed origin+method+headers, or `204` with only `Vary: Origin` on deny (the browser fails the preflight). Plain `OPTIONS` (no preflight marker) passes through to application handlers with headers applied. `methods` defaults to the supported method set (`GET, HEAD, POST, PUT, PATCH, DELETE`; `OPTIONS` implied by the mechanism itself) and gates strictly when configured; `allowedHeaders` defaults to reflecting `Access-Control-Request-Headers` and gates strictly when configured; `maxAge` is opt-in.
5. **Cache correctness:** every response from a CORS-configured app carries `Vary: Origin` (merged with any handler-set `Vary`, never duplicated) — including denies, errors, and preflights — so shared caches cannot serve one origin's authorization to another.
6. **Pipeline-bypass boundary, fail-closed:** configuring `cors` alongside static native route values (`Response`, `Bun.file`/`Blob`, `{ dir }`) or `assets` is rejected at startup (`LUGAS_CORS_004`) rather than silently serving un-policy'd responses. This is a deliberate scope line, not a capability claim; a later decision may wrap file responses explicitly.
7. **Manifest unchanged:** `lugas-manifest-v1` records routing, not policy; CORS adds no routes and changes no facts.
8. **Header application mechanics:** response headers are mutated in place when mutable; only if mutation throws (immutable-guard edge) is the response reconstructed. Header names are emitted in `Access-Control-*` canonical form.

## Consequences

- Positive: cross-origin browser frontends (the ADR-0021 artifact lane) work against Lugas servers with explicit, auditable policy; deny-by-default and `Vary: Origin` are structural, not opt-in per route.
- Positive: Bun's router and native fast paths stay untouched — wrappers add one function layer per handler, and the no-`cors` path adds zero.
- Cost/tradeoff: applications combining static/asset serving with CORS must move those routes to handlers or a separate app until a later decision covers them; the startup rejection makes that cost visible instead of partial.
- Cost/tradeoff: preflight `Access-Control-Allow-Methods` reflects the configured/default set, not the target route's own declared methods (the fallback has no path context without reimplementing routing); a preflight may approve a method the actual request then 404s on. Authorization is unaffected — only the precision of the preflight answer.
- Compatibility effect: additive config key plus type-only exports from the root subpath (protected-file change owned by the single M8-001 issue); `package.json` and `bun.lock` untouched.
- Security effect: the origin allowlist is exact-string (scheme+host+port); `Origin: null` is treated as an ordinary matchable string, never special-cased; credential/wildcard incompatibility is enforced both at startup and at runtime for callback results.

## Alternatives considered

- Per-route CORS via `guard()`: rejected — `Vary: Origin` and preflight handling are app-wide response-policy concerns; per-route opt-in would make cache correctness and fallback coverage partial by construction.
- A `middleware`-style global fetch indirection replacing the routes map: rejected — violates ADR-0004 (Bun's router must stay the request-path router).
- Wrapping static `Response`/`Bun.file`/`{dir}` values by reconstructing responses: rejected — single-consumption stream bodies and native file semantics (range requests, validators) cannot be preserved honestly without new evidence; fail-closed rejection is reversible, silent partial enforcement is not.
- Emitting `Access-Control-Allow-Origin: *` by default: rejected — the roadmap fixes the safe default as no cross-origin access unless explicitly enabled.

## Evidence

Implementation issue [#346](https://github.com/ther12k/lugas/issues/346) (M8-001) delivers the behavior tests (origin decisions, preflight allow/deny matrix, `Vary` merging, native handler and fallback coverage, traffic-gate/error-path coverage, startup rejections, config diagnostics) and the evidence report `docs/reports/issues/M8-001.md`.

## Revisit trigger

If a later milestone wraps native file serving in framework handlers with parity evidence (range requests, validators, MIME detection), LUGAS_CORS_004's rejection of `assets`/static values can be relaxed by amendment. If manifest consumers need policy visibility, that requires a manifest schema decision beyond v1.
