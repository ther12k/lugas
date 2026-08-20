---
type: Architecture Decision Record
title: ADR-0014 — Separate Compile-Time Contract and Runtime Manifest
status: accepted
tags:
- adr
- architecture
- '0014'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0014 — Separate Compile-Time Contract and Runtime Manifest

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

TypeScript can infer handler return bodies and statuses, but those types are erased. Presenting them in a runtime manifest without explicit metadata would be false.

## Decision

Maintain two artifacts: an erased compile-time app contract for the typed client, and a runtime manifest built only from descriptor values. Do not infer runtime response schemas/statuses from TypeScript types.

## Consequences

- The manifest is truthful but less rich than OpenAPI.
- OpenAPI generation is deferred until explicit schema/response metadata exists.
- Client types remain powerful without pretending to be runtime introspection.
- Documentation must explain the distinction.

## Alternatives considered

- Serialize inferred types: impossible without a compiler/codegen step.
- Execute handlers at startup: unsafe and semantically invalid.
- Duplicate response declarations immediately: rejected as unnecessary scope.

## Validation and revisit trigger

M4 manifest golden tests and M6 clean-room review ensure no field crosses the boundary without runtime evidence.
