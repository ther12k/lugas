---
title: "Roadmap"
description: "Shipped beta surface and planned first-party batteries."
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
| OpenAPI and Scalar | Planned first-party integration |
| CORS middleware | Planned first-party integration |
| Server-Sent Events | Planned core helper |
| Structured request logging | Planned core facility |
| Drizzle ORM integration | Planned optional adapter |

Planned capabilities are **not part of `v0.1.0-beta.1`** unless a later release explicitly documents them as available.

## Planned first-party batteries

### OpenAPI 3.1

Planned to generate an OpenAPI document from route methods and paths, path parameters, request bodies, response statuses, Problem Details responses, explicit route metadata, and schemas that expose a Standard JSON Schema representation.

Standard Schema validation alone does not guarantee runtime schema introspection: validators without a JSON Schema representation will require explicit OpenAPI metadata rather than receiving a guessed or incomplete schema. The document should be available as JSON, usable independently of any documentation UI.

### Scalar API reference

Scalar is planned as an optional presentation layer over the generated OpenAPI document. OpenAPI JSON remains the canonical contract; Scalar documentation is opt-in, replaceable, and must be explicitly exposed in production. Starter projects may enable `/docs` during development; applications may disable interactive requests or protect the documentation route.

### CORS

Maintained CORS middleware is planned with explicit origin allowlists, callback-based origin decisions, preflight handling, exposed and allowed headers, credential configuration, `Vary: Origin` correctness, and stable configuration diagnostics. CORS will not default to a permissive wildcard policy — the safe default is **no cross-origin access unless the application explicitly enables it**.

### Server-Sent Events

SSE is planned as a native response helper built on web streams: correct `text/event-stream` headers, event IDs, named events, retry hints, comments and heartbeats, serialization helpers, cancellation handling, backpressure-aware streaming, and deterministic cleanup when the connection closes. SSE belongs close to the core because it is an HTTP response primitive, not an infrastructure product.

### Structured logging

A small logger contract rather than a logging-vendor binding: structured JSON logs, request IDs, method and route, response status, request duration, stable diagnostic codes, error redaction, child logger context, and configurable levels. Applications should be able to adapt the contract to Pino, OpenTelemetry-aware loggers, or another system without changing route code. Sensitive headers, cookies, authorization values, and request bodies must not be logged by default.

### Drizzle ORM integration

An optional first-party integration, not a core dependency. The adapter should accept an application-owned Drizzle instance, expose it through typed guard or service context, avoid hidden global connections and implicit startup migrations, support explicit startup/shutdown hooks, and remain replaceable. Lugas should not become an ORM framework: schema design, migrations, transactions, connection pooling, tenancy boundaries, credentials, and shutdown behavior stay application-owned.

## Proposed integration defaults

Once the planned integrations land, the intended defaults are:

| Capability | Proposed default |
|---|---|
| OpenAPI document | Explicitly enabled; starter may enable in development |
| Scalar UI | Development-only in starter; explicit in production |
| CORS | Disabled unless configured |
| SSE | Available per route |
| Access logging | Concise development logging; explicit production policy |
| Drizzle | Never initialized implicitly |

## Release status

The framework implementation, compatibility matrix, clean-room review, package rehearsal, and candidate attestation are complete for `v0.1.0-beta.1`. The remaining publication action is intentionally owner-controlled; until then no npm package or GitHub release should be assumed available, and the attested tarball must not be rebuilt. See [`releases/beta/CHECKLIST.md`](https://github.com/ther12k/lugas/blob/main/docs/releases/beta/CHECKLIST.md) and [`releases/beta/POST-FREEZE-NOTES.md`](https://github.com/ther12k/lugas/blob/main/docs/releases/beta/POST-FREEZE-NOTES.md).
