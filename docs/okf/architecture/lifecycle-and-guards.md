---
type: Architecture Specification
title: Minimal Request Lifecycle and Typed Guards
status: draft
tags:
- lifecycle
- guards
- authorization
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Minimal Request Lifecycle and Typed Guards

## Lifecycle

```text
Bun route selection
  → declared input decoding and validation
  → guard 1
  → guard 2
  → ...
  → handler
  → native response

Any unexpected throw/rejection
  → application error policy
```

This is the complete public lifecycle vocabulary for v0.1.

## Why validation precedes guards

One deterministic order is easier to type, test, and explain. Params/query/header/body declared by the route are available to every guard. Applications should configure Bun body limits and may avoid declaring body validation on routes where an early native authentication layer is required.

A pre-parse guard stage is intentionally excluded. Adding one would split guard types and lifecycle ordering; reconsider only with measured production need.

## Guard declaration

```ts
const requireAdmin = guard<Services>({
  name: "requireAdmin",
  handler({ request, services, actor }) {
    if (!actor.roles.includes("admin")) {
      return problem(403, {
        code: "FORBIDDEN",
        title: "Administrator access required",
      });
    }

    return { admin: actor };
  },
});
```

## Guard result model

A guard result is exactly one of:

```ts
type GuardResult<Extension, Stop extends Response> =
  | Extension
  | Stop
  | Promise<Extension | Stop>;
```

An empty extension may be `{}`. `undefined` is rejected so accidental missing returns do not silently continue.

## Ordering and collisions

- Guards run left to right.
- A response stops all later guards and the handler.
- An unexpected throw uses the global error policy.
- Enrichment keys become available only after the guard that creates them.
- Duplicate enrichment keys are forbidden unless a future explicit replacement primitive is approved.
- Guard names must be unique within an application when they appear in the manifest; two instances with the same behavior should reuse the same descriptor.

## Sync fast path

If validation, every guard, and the handler complete synchronously, the compiler must not introduce unnecessary promise chaining. If any step returns a promise, normal `await` semantics apply. M1-010 and M5-012 measure and stress both paths.

## No `after` hook in v0.1

Response mapping, finalizers, and after-response work create subtle behavior around streams, errors, and cancellation. Applications may wrap handlers with ordinary functions. A framework hook is deferred until a concrete, measured use case justifies it.
