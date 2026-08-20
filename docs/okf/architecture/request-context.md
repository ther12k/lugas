---
type: Architecture Specification
title: Request Context, Services, and Data Ownership
status: draft
tags:
- context
- services
- guards
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Request Context, Services, and Data Ownership

## Fixed base context

```ts
type BaseContext<Services, Params> = {
  readonly request: Request;
  readonly services: Services;
  readonly params: Params;
};
```

Declared validation and guards extend this type. Context is a per-request object or specialized equivalent, never a mutable global.

## Services

Services are application-owned values passed to `defineApp`:

```ts
const services = {
  users,
  sessions,
  clock,
};
```

Lugas does not instantiate, dispose, proxy, scope, or discover services. Applications may pass plain objects, classes, functions, pools, or test doubles. Lifecycle management remains explicit in application/bootstrap code.

## Guard enrichment

A guard returns a plain object:

```ts
return { actor, permissions };
```

The compiler merges enrichments in declaration order. Duplicate keys are a type error where detectable and a startup diagnostic otherwise. Guards may not overwrite base fields such as `request`, `services`, or `params`.

## Immutability

The public context is readonly by type. This does not deep-freeze application services or body values. The rule prevents framework-level reassignment and makes data flow easier to reason about.

## Allocation policy

Initial implementation may create one context object per descriptor request. Performance work may specialize contexts, but observable property availability and readonly semantics remain stable. Optimization must not use shared mutable objects across requests.

## Cookie and URL access

Use native Bun/web APIs:

```ts
const url = new URL(request.url);
const session = request.cookies?.get?.("session");
```

The exact cookie API depends on the pinned Bun version. Lugas does not add a second cookie abstraction in v0.1.

## State

There is no generic `state` bag in the initial API. Guard enrichments are typed named fields; handler-local state is ordinary local variables. A generic bag would make ownership and collision rules less explicit.
