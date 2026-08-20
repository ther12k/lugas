---
type: Architecture Decision Record
title: ADR-0011 — Explicit Services and Guard Enrichment
status: accepted
tags:
- adr
- architecture
- '0011'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0011 — Explicit Services and Guard Enrichment

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Applications need dependencies and authenticated context, but implicit DI and global decoration create hidden state.

## Decision

Applications pass an explicit services object to `defineApp`. Guards may return named readonly context fields. Lugas does not instantiate services, define scopes, or allow global context mutation.

## Consequences

- Dependencies remain application-owned and testable.
- Routes defined in modules may require an explicit services generic or stateless type-binding helper.
- Guard collisions can be detected.
- No generic mutable state bag is included.

## Alternatives considered

- Framework DI container: rejected as a separate product.
- Closure-only services: possible but not the canonical structured context.
- Global `decorate`/`derive`: rejected due to hidden propagation.

## Validation and revisit trigger

M0-009 chooses the least costly generic binding. M2 type tests prove enrichment order and collision behavior.
