---
type: Architecture Decision Record
title: ADR-0006 — Native Response with Typed Helpers
status: accepted
tags:
- adr
- architecture
- '0006'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0006 — Native Response with Typed Helpers

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Automatic return normalization creates hidden rules for strings, objects, `undefined`, status, headers, and serialization. Native responses are clear but lose exact TypeScript contract information.

## Decision

Handlers and guards return native `Response` objects. Small helpers create native responses branded only at the type level with exact status/body metadata. Raw responses remain valid with conservative client typing.

## Consequences

- Wire behavior stays native and explicit.
- Typed client response unions are possible.
- Application code writes status explicitly.
- Plain-object return convenience is intentionally absent.

## Alternatives considered

- Automatic normalization: rejected as hidden behavior and expanding lifecycle.
- Custom response class: rejected because it breaks native interoperability.
- Require explicit response schemas: rejected as duplicate declaration for the first release.

## Validation and revisit trigger

M1 tests verify `instanceof Response`, cloning, streaming, headers, and body semantics. Bundle/type benchmarks guard helper cost.
