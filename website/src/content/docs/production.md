---
title: "Production hardening"
description: "Conservative secure headers and lifecycle-aware health/readiness endpoints."
---
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
- **Coverage**: route responses, guard short-circuits, framework errors (Problem Details), the not-found fallback, health endpoints, the [`spa`](https://github.com/ther12k/lugas/blob/main/docs/spa.md) shell, and object-form asset mappings (`{ path, cacheControl }`) all carry the policy. Static route values (`Response`, `Bun.file`, `{ dir }`), string-form [`assets.files`](/lugas/getting-started/#serving-public-assets) mappings, and `assets.dirs` mounts bypass the pipeline and carry none — serve policy-sensitive pages through the pipeline or a proxy.
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

The two endpoints differ in exactly one thing — **which side of the service-init traffic gate they sit on** ([services](/lugas/services/)):

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

## Deployment runbook

Four observable states, each with what probes and the process report (pinned by the lifecycle and deployment-smoke suites):

| State | `GET /health` | `GET /ready` | Ordinary routes | Process |
|---|---|---|---|---|
| Starting (init running) | `200 ok` | `503 unavailable` | held with 503 | booting |
| Ready | `200 ok` | `200 ready` | serving | running |
| Draining (SIGTERM) | — | — | — | port stops accepting immediately (probes fail to connect, not 5xx); in-flight requests and `track()`ed tasks finish within the drain deadline (default 10s) |
| Stopped | — | — | — | exit 0 when the drain completed; **disposal is withheld if the deadline expired** — the process still exits 0, so the exit code alone does not surface it |

Two deployment facts that are easy to get wrong:

- **Open streams hold the drain.** An SSE stream or WebSocket still open at SIGTERM is in-flight work: its deterministic cleanup runs, but if it never closes, the deadline expires and services are not disposed. Close clients before deploys, or keep streams short-lived.
- **Client disconnects do not cancel handler work.** A client that aborts mid-handler cannot stop the handler; the work runs to completion (a documented beta limitation). Size handler work to be safe to complete, not safe to abandon.

Who owns what:

- **The application owns** TLS (terminate it in a reverse proxy — recommended. `serve()` forwards unrecognized options to Bun's listener, so Bun's `tls` object is accepted and served, but Lugas does not type, document, or test TLS handling; prefer the proxy, or own the Bun TLS configuration yourself), dependency probes (compose them as your own handlers — see [What is deliberately not here](#what-is-deliberately-not-here)), upload budgets (route `budget`, app `bodyBudget`, serve `maxRequestBodySize` — [body limits](https://github.com/ther12k/lugas/blob/main/docs/body-limits.md)), and the static-asset policy boundary (native mounts carry no pipeline headers — [SPA and assets](https://github.com/ther12k/lugas/blob/main/docs/spa.md)).
- **The framework owns** the init traffic gate and readiness states, the drain deadline with reverse-order disposal, SSE stream cleanup on close, WebSocket close-1001 on shutdown, and health endpoints that answer on every probe.
- **The proxy owns** connection timeouts (set them **above** the drain deadline, or the proxy kills requests the framework is still draining), retry and backoff policy, and readiness-based traffic shifting (target `/ready`, not `/health` — liveness is intentionally always 200).

## What is deliberately not here

- **Per-dependency probes** (`/ready` checking your database): the probe vocabulary (timeouts, thresholds, caching) is a product surface. Compose it in your application — a guard-free handler that checks your own dependencies — or watch the [`drizzleService` `healthCheck` revisit trigger](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0026-drizzle-integration.md).
- **Header allow/deny lists**: three defaults plus two explicit opt-ins is the whole surface; anything richer belongs in userland middleware-free handlers.
- **Runtime health state** (`app.setHealthy(false)`): flip readiness through your own deployment tooling, not framework mutable state.

## Where next

- [Services](/lugas/services/) — the init gate and shutdown semantics behind `/ready`.
- [CORS](/lugas/cors/) — composes with the header policy.
- [Diagnostics](/lugas/diagnostics/) — `LUGAS_HEADERS_001`, `LUGAS_HEALTH_001`, `LUGAS_HEALTH_002`.
