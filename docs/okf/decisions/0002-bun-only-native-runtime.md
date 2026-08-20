---
type: Architecture Decision Record
title: ADR-0002 — Bun-Only Native Runtime
status: accepted
tags:
- adr
- architecture
- '0002'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0002 — Bun-Only Native Runtime

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Portability layers increase abstraction, test matrices, and pressure to avoid Bun-native route and server capabilities. The user explicitly wants a framework on top of native Bun.

## Decision

Lugas 0.x targets Bun only. It may use `Bun.serve`, Bun route tables, Bun files/directories, Bun test-server facilities, and Bun-specific types. No Node, Deno, Workers, or generic runtime adapter is part of the core.

## Consequences

- The framework can stay thin and preserve native behavior.
- Applications gain direct access to Bun features without adapter escape hatches.
- Runtime portability is deliberately sacrificed.
- Bun changes become a first-class compatibility responsibility.

## Alternatives considered

- Multi-runtime core: rejected as contrary to the product purpose.
- Portable core plus Bun adapter: rejected because it would shape all APIs around the least-common denominator.
- Build on Node HTTP: rejected because it would not be Bun-native.

## Validation and revisit trigger

Revisit only after a stable 1.x and measured user demand that cannot be met by a separate compatibility project.
