---
type: Architecture Decision Record
title: ADR-0007 — Minimal Validation–Guard–Handler Lifecycle
status: accepted
tags:
- adr
- architecture
- '0007'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0007 — Minimal Validation–Guard–Handler Lifecycle

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Large hook matrices create scope, ordering, error, and type propagation complexity. Lugas only needs validation, authorization/context enrichment, application handling, and unexpected-error policy for the initial product.

## Decision

The public request lifecycle is declared input validation, ordered guards, handler, and one error boundary. No pre-parse, transform, derive, resolve, after-handle, map-response, or after-response hook families are included in v0.1.

## Consequences

- Lifecycle is easy to explain and compile.
- Some cross-cutting behavior uses ordinary wrapper functions or application-native handling.
- Validation occurs before guards by a single documented rule.
- Response finalization hooks are deferred.

## Alternatives considered

- Full Elysia-style lifecycle: rejected as outside the product boundary.
- Generic middleware with before/after semantics: rejected until streaming/error behavior is proven.
- Pre-auth stage: deferred because it splits guard availability and typing.

## Validation and revisit trigger

Revisit a hook only with a concrete production use case, lifecycle state machine, cancellation/streaming tests, and measurable cost.
