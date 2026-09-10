---
type: Architecture Decision Record
title: 'ADR-0029 — Production Hardening: Conservative Secure Headers and Lifecycle-Aware Health Endpoints'
status: accepted
tags:
- adr
- architecture
- security
- health
- '0029'
generated:
  by: zcode/glm
  at: '2026-09-10T00:00:00+07:00'
---

# ADR-0029 — Production Hardening: Conservative Secure Headers and Lifecycle-Aware Health Endpoints

## Status

Accepted by owner decision (ODR-0013, `docs/owner-decisions/m9-004-dispatch.md`, 2026-09-10), dispatching issue [#369](https://github.com/ther12k/lugas/issues/369) (M9-004). Fulfills item (c) of the post-beta.2 owner sequence recorded in ODR-0010: "secure headers (small, explicit, no invented strict CSP) and health/readiness helpers over the service lifecycle".

## Context

Lugas applications reaching production need two small things that raw composition cannot express *framework-honestly*:

1. **Security headers** are easy to get subtly wrong per route (a forgotten `nosniff` on one error path undoes the policy). A per-handler recipe scales badly; an app-level policy applied to every pipeline response is one decision. But security-header "packages" typically also invent an opinionated Content-Security-Policy — exactly what the owner's directive excludes. CSP templates that silently break inline scripts (or worse, silently permit `unsafe-inline` to avoid breakage) are a liability, not a default.
2. **Health/readiness endpoints** look trivial (`200 JSON`) until the lifecycle contract is considered: the ADR-0020 traffic gate holds *every* Lugas handler until service `init` settles — including a naively mounted `/ready`, which would therefore never answer 503-during-boot, and a naively mounted `/health`, which would 503 while booting and mislead orchestrators into restarting a healthy process. The distinction between liveness and readiness is precisely *which side of the traffic gate* the endpoint sits on; only the framework owns that boundary.

Zero production dependencies carries over; both helpers are pure response-shaping and gate wiring.

## Decision

Two independent, opt-in `defineApp()` config keys:

1. **`secureHeaders: true | { contentSecurityPolicy?, hstsMaxAge? }`** — an app-level, fill-if-absent header policy over every pipeline response:
   - Defaults when enabled: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. These are the conservative OWASP-baseline set; nothing else is implied.
   - **No default CSP** — the owner's explicit constraint. `contentSecurityPolicy` is an explicit string when the application chooses one; Lugas never generates, templates, or relaxes it.
   - `hstsMaxAge` emits `Strict-Transport-Security: max-age=<n>` for https deployments (opt-in; meaningless to enforce on plain-http dev hosts).
   - **Fill-if-absent:** a handler's own header wins. The policy hardens negligence (forgotten headers) rather than fighting intent (a page legitimately re-scoping `frame-ancestors` via CSP). Documented, not hidden.
   - Invalid configuration (non-string CSP, non-positive HSTS age, unknown form) fails closed at `defineApp()` (`LUGAS_HEADERS_001`).
   - Assets bypass the pipeline and therefore carry no policy headers (same truth as CORS/guards — ADR-0018); the CORS wrapper composes unchanged (policy applies inside the CORS outermost wrap).
2. **`health: true | { livenessPath?, readinessPath? }`** — lifecycle-aware endpoints, defaults `/health` and `/ready`:
   - **`GET /health` (liveness)** bypasses the traffic gate and answers `200 {"status":"ok"}` whenever the server accepts connections — including during service init. Liveness means "the process is alive"; a booting pod must not be restarted for answering it.
   - **`GET /ready` (readiness)** also bypasses the gate but *awaits* it internally: `200 {"status":"ready"}` once every `init` settled; `503 {"status":"unavailable"}` while held or after a startup failure. Readiness is the orchestrator's signal to route traffic.
   - Both are ordinary compiled routes: manifest facts at their paths, `HEAD` derived by Bun, startup ownership collision against routes and assets (`LUGAS_HEALTH_002`), config validation (`LUGAS_HEALTH_001`).
3. **Non-goals (this battery):** per-dependency probes (the ADR-0026 `healthCheck` revisit trigger stands — no silent `init` reuse), CSP builders/serializers/nonces, header allowlist/denylist configuration, mutable runtime health state (`setState`-style APIs).
4. **Packaging:** config-key types exported additively from `src/index.ts`; no new subpath; no dependencies; `package.json`/`bun.lock` untouched.
5. **Diagnostics:** `LUGAS_HEADERS_001` (invalid secureHeaders configuration), `LUGAS_HEALTH_001` (invalid health configuration), `LUGAS_HEALTH_002` (health endpoint path collision with a route or asset) — catalogued; goldens regenerated with the reason recorded.

## Consequences

- Positive: production hardening becomes two declarations, not a checklist; the security baseline cannot regress per-route.
- Positive: readiness/liveness semantics are *correct by construction* relative to the traffic gate — a distinction no application-level mounting can express.
- Cost/tradeoff: fill-if-absent means a handler that sets a bogus `X-Content-Type-Options` value wins; accepted (policy documents it) because fighting intent is worse and Problem Details responses are framework-owned anyway.
- Cost/tradeoff: assets and pipeline-bypass route kinds carry no policy headers; applications needing policy on static files must serve them through the pipeline or a proxy. Documented.
- Compatibility effect: two additive config keys + three diagnostics; the response wrapper sits between the compiled handler and the CORS outermost wrap; the health endpoints mount outside the gate with explicit facts.

## Alternatives considered

- **CSP default with a "safe" template:** rejected — the owner's explicit constraint; any template breaks someone or lies with `unsafe-inline`.
- **Framework-wins header policy:** rejected — silently clobbering an application's explicit `Referrer-Policy` is hostile; fill-if-absent hardens the common case without hijacking intent.
- **`/ready` gated like ordinary handlers (held → the generic 503 problem):** rejected — readiness needs its own stable JSON shape and must answer (not hang) during init; the generic gate 503 remains for everything else.
- **Per-dependency health checks (`health: { checks: {...} }`):** rejected for this battery — the probe vocabulary (timeout, threshold, cache) is a product surface; the ADR-0026 `healthCheck` revisit trigger is the recorded escape hatch.
- **`X-XSS-Protection` default:** rejected — the header is deprecated and ignored (or actively harmful) in modern browsers; adding it would be security theater.

## Evidence

Implementation issue [#369](https://github.com/ther12k/lugas/issues/369) (M9-004) delivers behavior tests (defaults and fill-if-absent, CSP/HSTS emission, config diagnostics, liveness-during-init vs held routes, readiness flip, collision), `docs/production.md`, and `examples/production/`; evidence report `docs/reports/issues/M9-004.md`.

## Revisit trigger

Per-dependency probe composition (`healthCheck` on services, aggregated into `/ready`) if real deployments demonstrate the need — by ADR amendment with its own evidence, never by silently reusing `init`. A CSP builder belongs in userland forever unless the owner revisits.
