---
type: Design Principles
title: LugasJS Design Constitution
status: draft
tags:
- principles
- constitution
- architecture
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS Design Constitution

These principles are stronger than convenience preferences. Violating one requires evidence and an ADR.

## P1 — Bun-native, not Bun-compatible

Lugas targets Bun directly. It may use Bun-specific route tables, server options, request parameters, test hooks, files, and tooling. Runtime portability is not a 0.x goal.

## P2 — Bun owns routing

Lugas may validate and compose route declarations at startup, but request dispatch must remain in Bun's router. No custom matcher, regex chain, trie, or fallback dispatch table may become the normal request path.

## P3 — One canonical representation

A route has one public representation. Full path, HTTP method, schemas, guards, and handler remain statically visible. Avoid fluent chains, decorators, controller reflection, and multiple aliases for the same behavior.

## P4 — Native web objects remain first-class

`Request` and `Response` are not implementation details to hide. Helpers may add type information but must return native objects.

## P5 — Explicit context

Services are declared by the app. Guards enrich context explicitly and locally. No plugin may silently decorate every handler.

## P6 — Pay only for declared work

Do not parse a body, project headers, validate query data, allocate a generalized context, or enter async plumbing when a route does not require it.

## P7 — Types must remain affordable

A type-safe API that freezes the editor is not friendly. Measure type instantiation, diagnostics, memory, and wall-clock cost as first-class performance dimensions.

## P8 — Runtime truth over plausible metadata

Runtime manifests may report only data preserved at runtime. Compile-time inferred response bodies and statuses remain type contracts unless explicitly materialized as metadata.

## P9 — Expected outcomes are returned

Business and validation outcomes return typed responses. Unexpected infrastructure or programming failures use the error boundary. The distinction keeps contracts accurate.

## P10 — Optional means detachable

Client, testing, CLI, examples, and future integrations use subpath exports or separate development tooling. Importing `lugas/client` must not load Bun server code.

## P11 — Stable diagnostics are part of the API

Developer mistakes fail early with stable codes, route/method context, and corrective guidance. Diagnostics are testable contracts, not incidental strings.

## P12 — Evidence before claims

Performance, compatibility, security, and AI-friendliness claims require reproducible evidence. Targets and measured results must never be mixed.

## P13 — Delete before abstracting

When scope pressure appears, prefer removing a feature from the milestone over designing a speculative generalization.

## P14 — Agent-friendly means explicit, not merely short

Fewer characters are not the objective. Deterministic files, named concepts, local data flow, stable commands, bounded tasks, and truthful inspection are.
