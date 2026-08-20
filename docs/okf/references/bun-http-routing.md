---
type: Reference
title: Bun HTTP Server and Routing — Relevant Contracts
status: stable
tags:
- reference
- bun
- routing
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Bun HTTP Server and Routing — Relevant Contracts

**Official sources:**

- https://bun.sh/docs/runtime/http/server
- https://bun.sh/docs/runtime/http/routing

**Retrieved:** 2026-08-21

## Relevant capabilities

Bun documents native `Bun.serve`, a `routes` table, literal and parameterized routes, method-specific handlers, wildcards, static responses, files/directory routes, fallback handling, and server lifecycle/test functionality.

## Lugas use

- Lugas declarations compile into the native route table.
- Static/native values pass through where supported.
- Raw Bun characterization is the oracle for precedence and automatic method behavior.
- `server.fetch` or equivalent Bun facilities support realistic integration tests.
- Lugas does not reproduce documented directory path normalization/security behavior.

## Compatibility caution

Documentation and types can change across Bun releases. M0 captures executable behavior for the pinned version; release documentation is not a substitute for conformance tests.
