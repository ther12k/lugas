---
type: Architecture Specification
title: Compile-Time Route Contract Type System
status: draft
tags:
- types
- contract
- typescript-performance
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Compile-Time Route Contract Type System

## Purpose

Extract enough information from the server application type to drive the client without turning the framework into a recursive type puzzle.

## Contract dimensions

For each exact method/path pair:

- path parameter names from the literal path;
- validated params output when declared;
- validated query output when declared;
- validated headers output when declared;
- validated JSON body output when declared;
- handler success/error typed response union;
- guard short-circuit response union;
- conservative fallback for raw responses.

## Proposed internal shape

```ts
type RouteContract = {
  input: {
    params?: unknown;
    query?: unknown;
    headers?: unknown;
    body?: unknown;
  };
  responses: {
    status: number;
    body: unknown;
    mediaType: string | null;
  };
};

type AppContract = Record<
  string, // literal path
  Partial<Record<HttpMethod, RouteContract>>
>;
```

This shape is conceptual. The implementation may use tuples or distributed unions if benchmarks prove them cheaper.

## Type-cost rules

- Avoid converting paths into deep Proxy object trees.
- Avoid recursively merging arbitrary plugin state.
- Avoid distributive conditionals over the entire route set when a per-path lookup works.
- Keep diagnostic helper types private; expose readable resolved types in editor hovers.
- Add explicit cutoffs or generated-client fallback only after M3-017 evidence.
- Never hide cost with `skipLibCheck` in the type-performance fixture.

## Services and module typing tension

Routes defined outside `defineApp` need the services type before composition. M0-009 must compare:

1. explicit `defineModule<Services>` and `guard<Services>` generics;
2. a stateless `definitions<Services>()` factory with `.module`, `.route`, and `.guard` identity methods;
3. inline contextual typing for root routes.

Selection criteria: one canonical syntax, no mutable builder, no global declaration merging, no `any`, good hovers, low diagnostics cost, and easy AI generation. The public docs must update after the spike.

## Contract versus manifest

The app contract exists only in TypeScript declarations. Runtime code cannot enumerate it. The manifest is separately built from descriptors and must not use type-level claims as values.
