---
type: Roadmap
title: Lugas Roadmap
status: current
tags:
- roadmap
- beta
---

# Roadmap

## Beta surface (`v0.1.0-beta.1`)

| Capability | Status |
|---|---|
| Bun-native HTTP server | Available |
| Typed route declarations | Available |
| Root and module route composition | Available |
| Standard Schema validation | Available |
| Typed guards and context enrichment | Available |
| Status-discriminated, wire-honest responses | Available |
| RFC 9457 Problem Details | Available |
| End-to-end typed HTTP client | Available |
| Test-server helpers | Available |
| Static route manifest | Available |
| Route-inspection CLI | Available |
| OpenAPI and Scalar — shipped on `main` (M8-004, ADR-0025) | Available |
| CORS middleware — shipped on `main` (M8-001, ADR-0022) | Available |
| Server-Sent Events — shipped on `main` (M8-002, ADR-0023) | Available |
| Structured request logging — shipped on `main` (M8-003, ADR-0024) | Available |
| Drizzle ORM integration | Planned optional adapter |

Planned capabilities are **not part of `v0.1.0-beta.1`** unless a later release explicitly documents them as available.

## Planned first-party batteries

### OpenAPI 3.1 and Scalar — shipped on `main` (M8-004, ADR-0025)

Delivered as generation-first OpenAPI 3.1: the document is generated from route methods and paths, path parameters, request bodies, explicit route metadata (`route({ openapi })`), and schemas that expose the Standard JSON Schema interface (`~standard.jsonSchema`), feature-detected; validators without a JSON Schema representation document presence only, never a guessed shape. RFC 9457 Problem Details is documented as the standard error component. The document is served as JSON at `openapi.path` (default `/openapi.json`) and remains usable independently of any documentation UI. Scalar is the optional presentation layer: a zero-dependency HTML shell served at `ui.path` (default `/docs`) loading Scalar from its public CDN — OpenAPI JSON stays canonical, the UI is opt-in and replaceable, and production exposure is an explicit application choice. Reference: [`docs/openapi.md`](openapi.md). Not part of the attested `v0.1.0-beta.1` candidate; ships in the next release.

### CORS — shipped on `main` (M8-001, ADR-0022)

Delivered as the app-level, opt-in `defineApp({ cors })` policy with the planned shape: explicit origin allowlists, callback-based origin decisions, preflight handling, exposed and allowed headers, credential configuration, `Vary: Origin` on every response, and stable configuration diagnostics (`LUGAS_CORS_001`–`004`). CORS will not default to a permissive wildcard policy — the safe default is **no cross-origin access unless the application explicitly enables it**. Reference: [`docs/cors.md`](cors.md). Not part of the attested `v0.1.0-beta.1` candidate; ships in the next release.

### Server-Sent Events — shipped on `main` (M8-002, ADR-0023)

Delivered as the native response helper with the planned shape: correct `text/event-stream` headers, event IDs, named events, retry hints, comments and an opt-in heartbeat, the exported `formatSseEvent` serializer, `desiredSize`-aware streaming, and deterministic exactly-once cleanup when the connection closes (writer close, client disconnect, or server force-close). SSE belongs close to the core because it is an HTTP response primitive, not an infrastructure product — no broker, fan-out, or replay. Reference: [`docs/sse.md`](sse.md). Not part of the attested `v0.1.0-beta.1` candidate; ships in the next release.

### Structured logging — shipped on `main` (M8-003, ADR-0024)

Delivered as the small sink contract and opt-in access log facility: structured JSON logs, scalar-only fields (redaction by construction), request IDs (`x-request-id`), method, path, route, response status, duration in milliseconds, stable diagnostic `LUGAS_LOG_001`, and configurable levels. Adapts cleanly to Pino, OpenTelemetry loggers, or any standard sink. Reference: [`docs/logging.md`](logging.md). Not part of the attested `v0.1.0-beta.1` candidate; ships in the next release.

### Drizzle ORM integration

An optional first-party integration, not a core dependency. The adapter should accept an application-owned Drizzle instance, expose it through typed guard or service context, avoid hidden global connections and implicit startup migrations, support explicit startup/shutdown hooks, and remain replaceable. Lugas should not become an ORM framework: schema design, migrations, transactions, connection pooling, tenancy boundaries, credentials, and shutdown behavior stay application-owned.

## Proposed integration defaults

Once the planned integrations land, the intended defaults are:

| Capability | Proposed default |
|---|---|
| OpenAPI document | Explicitly enabled; starter may enable in development |
| Scalar UI | Development-only in starter; explicit in production |
| CORS | Disabled unless configured (shipped behavior) |
| SSE | Available per route (shipped behavior) |
| Access logging | Off unless configured — explicit production policy (shipped behavior; amends the earlier "concise development logging" proposal for the 0.x line, per ODR-0009) |
| Drizzle | Never initialized implicitly |

## Release status

The framework implementation, compatibility matrix, clean-room review, package rehearsal, and candidate attestation are complete for the `v0.1.0-beta.1` line. Per the owner's re-attestation decision ([#330](https://github.com/ther12k/lugas/issues/330)), the attested `2ed954d` artifact set is preserved unmodified as superseded history under [`releases/superseded/2ed954d/`](./releases/superseded/2ed954d/), and a post-M6R13 candidate is being attested as the intended first public beta; the active `releases/beta/` path will hold only the newly attested set. Publication remains an explicitly owner-controlled action after that gate.
