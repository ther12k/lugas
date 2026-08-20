---
type: Engineering Standard
title: TypeScript and Bun Coding Standard
status: draft
tags:
- typescript
- coding
- bun
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# TypeScript and Bun Coding Standard

## Language and compiler

- TypeScript strict mode is mandatory.
- `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `useUnknownInCatchVariables` should be enabled unless a measured blocker is documented.
- Avoid `any`; use `unknown` and narrow.
- Public generic parameters use descriptive names where it improves editor hovers.
- Prefer `readonly` data for descriptors, manifests, and public context.

## Runtime code

- Prefer native Bun/web APIs over compatibility wrappers.
- Avoid runtime reflection, `eval`, generated functions, and source transformation in v0.x.
- Do not allocate work for undeclared route features.
- Keep synchronous code synchronous; do not mark functions `async` merely for a shared signature.
- Use explicit error classes/codes for framework configuration failures.
- Bound recursion, issue serialization, and user-controlled collection sizes.

## Functions and files

- One concept per public source file where practical.
- Internal helpers stay small and single-purpose.
- Avoid classes unless identity/lifecycle requires them; descriptors are plain readonly objects.
- Avoid overloaded functions with materially different semantics.
- Avoid barrel imports inside implementation directories when they create cycles.

## Comments

Comments explain invariants, non-obvious Bun behavior, type-system compromises, or security constraints. Do not narrate obvious code. Public APIs receive TSDoc with one canonical example and failure semantics.

## Error handling

- Catch `unknown` and normalize intentionally.
- Expected HTTP outcomes return responses.
- Unexpected failures are not converted into successful values.
- Never log complete request objects, bodies, cookies, authorization headers, services, or validator internals by default.

## Formatting and linting

M0 selects a minimal deterministic formatter/linter setup. Tooling must not become a large runtime dependency or rewrite generated evidence unexpectedly. CI verifies formatting without auto-committing changes.
