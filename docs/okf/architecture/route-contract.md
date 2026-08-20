---
type: Protocol Specification
title: Lugas Route Declaration and HTTP Contract
status: draft
tags:
- route
- contract
- http
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Lugas Route Declaration and HTTP Contract

## Descriptor shape

```ts
route({
  params?: StandardSchema,
  query?: StandardSchema,
  headers?: StandardSchema,
  body?: StandardSchema,
  before?: readonly Guard[],
  handler: (context) => Response | Promise<Response>,
});
```

The returned value is branded as a Lugas descriptor. Route path and HTTP method come from the enclosing native-style route map.

## Handler context

The context contains only stable fields:

| Field | Availability | Meaning |
|---|---|---|
| `request` | always | Native `Request` selected by Bun. |
| `services` | always when configured | Exact application services object. |
| `params` | always | Native string params or validated/transformed params when schema declared. |
| `query` | only when declared | Validated query value. |
| `headers` | only when declared | Validated projected header value. |
| `body` | only when declared | Validated JSON body value. |
| guard fields | after corresponding guard | Explicit merged enrichment, such as `actor`. |

Do not add redundant convenience fields such as `url`, `cookie`, `set`, or `status` when native APIs already provide them.

## Return contract

A handler must return a native `Response` or a promise of one. Returning plain objects, strings, numbers, or `undefined` is a type error. This avoids hidden serialization and status rules.

Typed helpers preserve exact status/body information. A raw `Response` is legal but contributes a conservative contract such as `status: number` and `body: unknown` unless a later explicit declaration is accepted.

## Expected versus unexpected outcomes

Expected outcomes are returned:

```ts
if (!user) {
  return problem(404, {
    code: "USER_NOT_FOUND",
    title: "User not found",
  });
}
```

Unexpected failures throw or reject and flow to `onError`:

```ts
const user = await repository.find(id); // database outage may throw
```

## Input absence

If a schema is not declared:

- Lugas does not parse or project that input;
- the native request remains available;
- application code may use `request.json()`, `request.formData()`, headers, cookies, or streams directly;
- the typed client does not infer a structured field for that undeclared input.

## Request cancellation

Lugas does not replace `request.signal`. Validators, guards, and handlers may observe it. Framework code must not swallow abort errors or continue expensive work after cancellation where Bun exposes cancellation.

## Status semantics

The framework does not reinterpret HTTP status codes. `json(201, ...)`, `empty(204)`, and `problem(422, ...)` create native responses with the supplied status. Helpers validate impossible combinations where practical, such as a body on 204/304.
