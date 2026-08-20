---
type: Engineering Standard
title: Public API Design and Review Standard
status: draft
tags:
- api
- review
- public-contract
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Public API Design and Review Standard

## Admission test

A new public API must answer:

1. Which repeated application problem does it solve?
2. Why are native Bun, ordinary functions, or existing Lugas primitives insufficient?
3. Is it needed by most users or detachable as an optional export?
4. What runtime, bundle, typecheck, security, documentation, and compatibility cost does it add?
5. Can it be removed or changed during 0.x without fragmenting canonical syntax?

## Canonicality

There is one documented way to declare routes, guards, responses, and clients. Convenience aliases are rejected unless evidence shows a major usability problem and no new ambiguity.

## Naming

- Verbs create or execute: `defineApp`, `defineModule`, `route`, `guard`, `createClient`, `createTestServer`.
- Response helpers name wire format or action: `json`, `text`, `empty`, `problem`, `redirect`.
- Avoid generic names such as `use`, `plugin`, `context`, `handle`, or `middleware` as top-level concepts unless semantics are singular and obvious.

## Overloads

Overloads may improve literal inference, but all overloads must share one runtime meaning. Do not use argument count to switch between unrelated behavior.

## Defaults

Defaults must be secure, standards-compatible, and visible in documentation. Hidden production/development behavior is limited to safe error detail, not route semantics.

## Escape hatches

Raw `Request`, raw `Response`, native route entries, server options, and client `RequestInit` are supported escape hatches. They may widen type precision but must not be blocked.

## Review evidence

A public API PR includes:

- API snippet and alternative considered;
- type hover or `expectTypeOf` evidence;
- runtime tests;
- type-performance delta;
- bundle delta;
- migration/compatibility impact;
- documentation update;
- ADR when consequential.
