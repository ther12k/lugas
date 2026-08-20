---
type: Architecture Decision Record
title: ADR-0009 — Own Explicit Typed Fetch Client
status: accepted
tags:
- adr
- architecture
- 0009
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0009 — Own Explicit Typed Fetch Client

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Eden demonstrates valuable end-to-end typing but is coupled to Elysia application types. Treaty tree syntax adds Proxy and recursive path-property machinery that is not required for the capability.

## Decision

Lugas implements its own browser-safe client using explicit methods and literal path strings. It derives types from `typeof app`, returns discriminated HTTP results, and uses ordinary `fetch`. It does not depend on Eden or use Proxy/tree syntax in v0.1.

## Consequences

- Server/client ownership remains within Lugas.
- Call sites are explicit and searchable.
- Type performance is easier to bound.
- A tree façade may be explored later without changing the contract.

## Alternatives considered

- Use Eden directly: rejected due to Elysia coupling.
- Copy Treaty API: rejected due to type/runtime complexity.
- Codegen-only client: deferred until type evidence requires it.
- No typed client: rejected because end-to-end safety is a key product value.

## Validation and revisit trigger

M3-017 tests 25–1,000 route type cost. A separate tree client requires its own ADR and benchmarks.
