---
type: Architecture Decision Record
title: ADR-0013 — No AOT Application Compiler in 0.x
status: accepted
tags:
- adr
- architecture
- '0013'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0013 — No AOT Application Compiler in 0.x

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Elysia uses compilation techniques to optimize rich framework behavior. Lugas delegates routing to Bun and has a deliberately small descriptor pipeline.

## Decision

Lugas 0.x uses ordinary TypeScript modules and startup-time function composition. It does not generate handler source, run application dry-runs, transform code, or require an AOT compiler.

## Consequences

- Tooling remains small and debuggable.
- Startup composition cost must be measured at large route counts.
- Some metadata/codegen features are deferred.
- No `eval` or generated function security boundary is introduced.

## Alternatives considered

- AOT from day one: rejected without evidence of need.
- Decorator compiler: rejected as incompatible with canonical API.
- Babel/TS transform plugin: rejected as toolchain ownership.

## Validation and revisit trigger

Revisit only if 10,000-route startup/type evidence shows a concrete bottleneck that cannot be solved with simpler data composition.
