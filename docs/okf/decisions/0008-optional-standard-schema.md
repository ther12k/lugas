---
type: Architecture Decision Record
title: ADR-0008 — Optional Standard Schema Validation
status: accepted
tags:
- adr
- architecture
- 0008
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0008 — Optional Standard Schema Validation

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Choosing one validator forces ecosystem and bundle tradeoffs; writing a schema language would create a second product. Standard Schema provides a shared validation interface.

## Decision

Lugas accepts Standard Schema-compatible validators for params, query, headers, and JSON body. Validation is optional per route. Core targets structural compatibility without a production runtime dependency.

## Consequences

- Applications can choose Valibot, Zod, ArkType, or another conforming library.
- Schema-specific introspection is not assumed.
- Manifest metadata remains capability-level unless explicit metadata exists.
- Validator differences require conformance testing.

## Alternatives considered

- Built-in validator: rejected as scope and dependency growth.
- TypeBox-only schemas: rejected as unnecessarily restrictive.
- No validation support: rejected because it is a central application need.

## Validation and revisit trigger

M2-001 verifies spec/license/type strategy and multiple validators. Revisit dependency choice only if structural typing is unsafe or incompatible.
