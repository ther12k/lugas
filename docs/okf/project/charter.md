---
type: Project Charter
title: LugasJS Project Charter
status: draft
tags:
- project
- charter
- bun
- typescript
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS Project Charter

## Purpose

LugasJS exists for teams that find raw `Bun.serve` nearly sufficient but still need consistent route organization, input validation, authentication/authorization guards, typed status responses, end-to-end client types, testing helpers, and machine-readable inspection.

The project is not an attempt to beat Elysia by accumulating more features. Its purpose is to preserve Bun's native model while making production API code easier to read, generate, review, test, and modify.

## Problem statement

Raw Bun is intentionally low-level. As an application grows, teams repeatedly invent incompatible conventions for:

- grouping routes without hiding their actual paths;
- parsing and validating params, query, headers, and JSON bodies;
- representing expected HTTP errors;
- enriching request context after authentication;
- keeping frontend and backend request types synchronized;
- testing routes without opening unmanaged servers;
- inspecting the final route surface;
- giving coding agents enough deterministic context to make safe changes.

Larger frameworks solve these problems, but they often introduce their own router, lifecycle vocabulary, plugin scopes, context mutation model, type machinery, and compatibility surface. Lugas targets the narrower gap between raw Bun and a full application framework.

## Mission

Deliver the smallest credible Bun-native TypeScript framework that provides:

1. explicit, searchable route declarations;
2. startup-time composition into native Bun routes;
3. optional standards-compatible validation;
4. named, typed guards with deterministic context enrichment;
5. native responses carrying compile-time status/body contracts;
6. an explicit, browser-safe typed `fetch` client;
7. truthful route manifests, stable diagnostics, and testing helpers;
8. documentation and issue structure that coding agents can follow without reconstructing hidden framework state.

## Product boundaries

Lugas owns application structure and contracts. Bun owns the runtime, server, router, web primitives, files, WebSockets, and platform APIs. Applications own domain services, authentication strategy, persistence, business rules, observability backend, and deployment.

## Stakeholders

- Bun API developers who want less ceremony than a broad framework.
- Small teams using coding agents for implementation and maintenance.
- Framework maintainers who value stable, narrow public APIs.
- Library authors integrating validators, auth logic, databases, or domain modules without requiring a plugin runtime.

## Success condition

Lugas succeeds when a production-shaped API is materially clearer and safer than equivalent raw Bun while retaining near-native behavior and bounded runtime/type-system overhead. It fails if it becomes a second router, an implicit dependency-injection container, an Elysia compatibility layer, or a collection of unrelated integrations.

## Governance boundary

This bundle may recommend names, package paths, licensing, and release gates. It does not authorize public repository creation, package publication, trademark claims, paid reservations, or a final license. Those remain explicit owner decisions.
