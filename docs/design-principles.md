---
type: Reference
title: Design Principles
status: current
tags:
- design
- principles
---

# Design principles

## Explicit HTTP over disguised RPC

Methods, paths, statuses, headers, and transport failures remain visible. Native `Request` and `Response` stay available; the framework adds contracts around them rather than replacing them.

## Types should describe the wire

Request types describe what crosses the network. Handler types describe values after validation and transformation. Response types describe what the client can actually decode — see [wire-honest types](./wire-honest-types.md).

## No code generation

The server contract is inferred directly from the application type.

## No runtime route proxy

The typed client delegates to ordinary `fetch` with explicit method calls and path strings.

## Zero forced ecosystem

The core does not own your database, logger vendor, deployment platform, or authentication product. Common integrations should be maintained by the project, but applications must opt into behavior that affects security, infrastructure, or external dependencies.

## Deterministic inspection

The route graph is available as a stable manifest (`lugas-manifest-v1`) rather than existing only as runtime behavior — consumable by humans, CI, coding agents, and documentation generators.

## Batteries included, not batteries forced

OpenAPI, CORS, SSE, logging, and ORM integrations are planned as first-party but optional capabilities with conservative defaults (see the [roadmap](./roadmap.md)).

## Consequences

These principles trade ergonomics for predictability: more explicit client calls than object-tree RPC clients, a Bun-only server runtime, and a narrower ecosystem than established frameworks. The full trade-off list and framework comparisons are in [choosing-lugas.md](./choosing-lugas.md).
