---
type: Architecture Decision Record
title: ADR-0010 — RFC 9457 Problem Details
status: accepted
tags:
- adr
- architecture
- '0010'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0010 — RFC 9457 Problem Details

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Validation, authorization, domain, and unexpected errors need a predictable wire format. A proprietary envelope would create unnecessary client logic.

## Decision

Lugas `problem()` follows RFC 9457 Problem Details with `application/problem+json`. Lugas adds stable extension members such as `code` and bounded `issues` where appropriate.

## Consequences

- Clients can use standard fields and status-specific types.
- Problem `type` URIs must not claim an unowned domain.
- Applications may extend problems without replacing the base format.
- Unexpected production errors remain redacted.

## Alternatives considered

- Custom `{ error, message }` envelope: rejected as less standard.
- Throw every HTTP error: rejected because expected outcomes should be typed returns.
- Validator-native error body: rejected due to inconsistent contracts.

## Validation and revisit trigger

M1/M2 wire tests validate media type and fields. Security review validates redaction and bounded extensions.
