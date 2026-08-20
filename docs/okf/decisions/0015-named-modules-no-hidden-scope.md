---
type: Architecture Decision Record
title: ADR-0015 — Named Modules Have No Hidden Scope or Prefix
status: accepted
tags:
- adr
- architecture
- '0015'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0015 — Named Modules Have No Hidden Scope or Prefix

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Plugin/module systems often grow path prefixes, hook inheritance, context decoration, and encapsulation rules. Those features are a major source of mental overhead.

## Decision

A Lugas module is only a named route container used for organization, collision diagnostics, and manifest attribution. It has no hidden prefix, lifecycle, context, or service scope.

## Consequences

- Modules are easy to merge and inspect.
- Full route paths repeat.
- Cross-cutting behavior is declared per route or through ordinary application functions.
- Module order cannot decide collision winners.

## Alternatives considered

- Elysia-style scoped plugin: rejected.
- Nested module tree: rejected for v0.1.
- No modules at all: rejected because organization and manifest attribution are useful.

## Validation and revisit trigger

M1 collision tests and M4 manifest tests validate the boundary. Any scope feature needs a new ADR, not an additive option.
