---
type: Guide
title: Production Hardening
status: current
tags:
- guide
- security
- headers
- health
---

# Production hardening

Two opt-in declarations cover the common production baseline: a conservative security-header policy and lifecycle-aware health endpoints. Neither invents policy — no default Content-Security-Policy, no per-dependency probe framework. See [ADR-0029](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0029-production-hardening.md).

## Secure headers

```ts
import { defineApp, route, json } from "lugas";

export default defineApp({
  secureHeaders: true,
  routes: { /* … */ },
});
```

When enabled, every **pipeline response** carries the conservative baseline, filled only when the handler did not set the header itself:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `deny` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

**No Content-Security-Policy by default** — an invented CSP either breaks applications or lies with `unsafe-inline`. When your application has a real policy, set it explicitly:

```ts
secureHeaders: {
  contentSecurityPolicy: "default-src 'self'; script-src 'self'",
  hstsMaxAge: 31536000,   // Strict-Transport-Security, for https deployments
},
```

Semantics worth knowing:

- **Fill-if-absent**: a handler's own header wins. The policy hardens negligence (a forgotten header on one error path) rather than fighting intent — `json(200, page, { headers: { "x-frame-options": "sameorigin" } })` keeps `sameorigin`.
- **Coverage**: route responses, guard short-circuits, framework errors (Problem Details), and the not-found fallback all carry the policy. Static values (`Response`, `Bun.file`, `{ dir }`) and [`assets`](./getting-started.html#serving-public-assets) bypass the pipeline and carry none — serve policy-sensitive pages through the pipeline or a proxy.
- **CORS composes**: the policy applies inside the CORS wrapper (preflights skip it), so `cors` + `secureHeaders` is a normal combination.
- Invalid configuration fails closed at startup (`LUGAS_HEADERS_001`): CSP must be a non-empty string, `hstsMaxAge` a positive integer.

Deliberately absent: `X-XSS-Protection` (deprecated by browsers — adding it would be security theater) and any CSP builder/serializer.

## Health and readiness

```ts
export default defineApp({
  health: true,           // mounts GET /health and GET /ready
  services: { /* … */ },
});
```

The two endpoints differ in exactly one thing — **which side of the service-init traffic gate they sit on** ([services](./services.md)):

| Endpoint | During init | After init | After a failed startup |
|---|---|---|---|
| `GET /health` (liveness) | `200 {"status":"ok"}` | `200 {"status":"ok"}` | `200 {"status":"ok"}` |
| `GET /ready` (readiness) | `503 {"status":"unavailable"}` | `200 {"status":"ready"}` | `503 {"status":"unavailable"}` |

The asymmetry is the point: a booting process is *alive* (killing it for answering liveness slowly would be wrong), while it is not *ready* to take traffic. Ordinary routes stay held with the framework's 503 until every `init` settles — readiness answers immediately instead of hanging, so orchestrators polling it get an answer on every probe.

Paths are renamable, and both endpoints are ordinary manifest routes (visible to `bunx lugas routes`, ownership-checked at startup):

```ts
health: { livenessPath: "/healthz", readinessPath: "/readyz" }
```

Colliding with an existing route or asset fails closed (`LUGAS_HEALTH_002`); invalid paths fail with `LUGAS_HEALTH_001`.

## What is deliberately not here

- **Per-dependency probes** (`/ready` checking your database): the probe vocabulary (timeouts, thresholds, caching) is a product surface. Compose it in your application — a guard-free handler that checks your own dependencies — or watch the [`drizzleService` `healthCheck` revisit trigger](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0026-drizzle-integration.md).
- **Header allow/deny lists**: three defaults plus two explicit opt-ins is the whole surface; anything richer belongs in userland middleware-free handlers.
- **Runtime health state** (`app.setHealthy(false)`): flip readiness through your own deployment tooling, not framework mutable state.

## Where next

- [Services](./services.md) — the init gate and shutdown semantics behind `/ready`.
- [CORS](./cors.md) — composes with the header policy.
- [Diagnostics](./diagnostics.md) — `LUGAS_HEADERS_001`, `LUGAS_HEALTH_001`, `LUGAS_HEALTH_002`.
