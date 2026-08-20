---
type: Architecture Decision Record
title: ADR-0003 — Minimal Explicit and Agent-Friendly API
status: accepted
tags:
- adr
- architecture
- '0003'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0003 — Minimal Explicit and Agent-Friendly API

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Rich fluent APIs and global context mutation can be concise for experienced users but require humans and agents to reconstruct hidden state and ordering.

## Decision

Use one object-based canonical syntax with a small vocabulary: application, module, route, guard, response helpers, client, and testing helper. Full behavior remains local and statically searchable. Avoid decorators, broad overloads, macros, hidden context decoration, and multiple equivalent route forms.

## Consequences

- Code is slightly more verbose than fluent DSLs.
- Routes are easier to locate and review.
- Public API growth has a strong admission gate.
- AI-friendliness is tested through clean-room work rather than asserted.

## Alternatives considered

- Elysia-like fluent chain: rejected because Lugas is intentionally not a smaller imitation.
- Controller decorators: rejected because route ownership becomes indirect.
- Configuration plus many convenience aliases: rejected because canonical syntax fragments.

## Validation and revisit trigger

M0-009 and M6-008 validate type ergonomics and clean-room agent usability. If explicit service generics are too costly, choose one stateless type-binding mechanism through an ADR amendment.
