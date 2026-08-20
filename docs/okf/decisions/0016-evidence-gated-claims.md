---
type: Architecture Decision Record
title: ADR-0016 — Evidence-Gated Performance and Release Claims
status: accepted
tags:
- adr
- architecture
- '0016'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0016 — Evidence-Gated Performance and Release Claims

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Framework projects often publish best-case throughput or “production-ready” language before security, compatibility, type cost, and real application behavior are proven.

## Decision

Treat performance numbers as targets until reproducible reports exist. Reserve “production-ready” or beta claims for the documented release gates. Compare feature-equivalent raw Bun and Elysia fixtures and retain raw evidence.

## Consequences

- Marketing is constrained by engineering evidence.
- A target miss may delay a claim or release rather than be hidden.
- Negative results remain valuable design input.
- Gate issues become release authority.

## Alternatives considered

- Informal benchmark posts: rejected as insufficient.
- No benchmarks: rejected because near-native behavior is a product claim.
- Single synthetic route as proof: rejected.

## Validation and revisit trigger

M5 and M6 gates require controlled reports, raw data, security review, compatibility matrix, and clean-checkout reproduction.
