---
type: Architecture Decision Record
title: ADR-0004 — Bun Native Router Is Authoritative
status: accepted
tags:
- adr
- architecture
- '0004'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0004 — Bun Native Router Is Authoritative

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Bun already provides a native route table with parameters, wildcards, methods, static responses, and file/directory support. A framework router would duplicate hot-path work and semantics.

## Decision

Lugas composes declarations into `Bun.serve({ routes })`. Bun performs route selection. Lugas never routes normal requests through a catch-all matcher, custom trie, regex chain, or application-level dispatch map.

## Consequences

- Native route optimizations remain available.
- Lugas must characterize and track Bun routing behavior.
- Some cross-route features common in frameworks are intentionally harder or excluded.
- Route overlap follows Bun, while exact duplicate method/path pairs fail at startup.

## Alternatives considered

- Custom router: rejected for runtime and semantic duplication.
- Catch-all handler with internal dispatch: rejected because it defeats the native design.
- Compile a second native addon router: rejected as unnecessary complexity.

## Validation and revisit trigger

Any code path that performs framework route lookup per request violates this ADR. Revisit only if Bun removes required routing capability and no native extension exists.
