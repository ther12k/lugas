---
type: Architecture Decision Record
title: ADR-0005 — Native-Style Full-Path Route Maps
status: accepted
tags:
- adr
- architecture
- '0005'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0005 — Native-Style Full-Path Route Maps

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Hidden prefixes and fluent grouping shorten source but make the effective route path harder to search, inspect, and assign to agents.

## Decision

Routes are declared in native-style maps keyed by full path, with HTTP methods visible at the next level. Modules organize these maps but do not alter paths. Route metadata precedes the handler within its descriptor.

## Consequences

- Paths repeat across related routes, trading brevity for clarity.
- Manifests and source use the same path strings.
- Collision detection is straightforward.
- A future prefix helper is not assumed.

## Alternatives considered

- Nested route tree: rejected due to path reconstruction and type complexity.
- Module prefixes: rejected for v0.1 because they hide effective paths.
- Fluent `.group()` APIs: rejected as another canonical representation.

## Validation and revisit trigger

M0 type spike confirms literal-path contract extraction. Revisit a prefix helper only with agent-search and type-cost evidence.
