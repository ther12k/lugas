---
type: Protocol Specification
title: Typed Native Responses and Problem Details
status: draft
tags:
- responses
- errors
- rfc9457
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Typed Native Responses and Problem Details

## Typed response model

```ts
declare const responseContract: unique symbol;

type TypedResponse<Status extends number, Body> = Response & {
  readonly [responseContract]?: {
    readonly status: Status;
    readonly body: Body;
  };
};
```

The symbol is type-only or non-enumerable and never changes headers, body, cloning, streaming, or `instanceof Response` behavior.

## Helpers

### JSON

```ts
json(200, { data: user });
```

Sets `content-type: application/json; charset=utf-8` unless the supplied headers already contain a valid explicit value under a documented policy. Uses native serialization behavior and reports serialization failures through the error boundary.

### Text

```ts
text(200, "ready");
```

Returns text with a standard content type.

### Empty

```ts
empty(204);
```

Rejects statuses that require or normally imply a body only where the rule is unambiguous. It never serializes `undefined` as JSON.

### Problem

```ts
problem(404, {
  code: "USER_NOT_FOUND",
  title: "User not found",
  detail: "No user exists with the supplied identifier.",
});
```

Produces `application/problem+json` and includes the numeric `status` in the body. Standard fields follow RFC 9457; extension members such as `code` and `issues` must not collide with reserved fields.

### Redirect

```ts
redirect("/login", 303);
```

Uses native redirect semantics and a constrained redirect-status union when practical.

## Response unions

A handler may return multiple helpers. Type extraction produces a status-discriminated union. A guard's short-circuit responses are merged with the handler union.

Duplicate status codes with incompatible bodies are allowed only if the client body type becomes their union; diagnostics should encourage unique stable problem `code` values.

## Raw responses

Raw `Response` preserves escape-hatch behavior. Because its exact status/body are not type-visible, the client contract must widen conservatively. Lugas must never inspect or consume a response body at startup to infer a contract.

## Unexpected errors

Default 500 response:

```json
{
  "type": "about:blank",
  "title": "Internal Server Error",
  "status": 500,
  "code": "INTERNAL_SERVER_ERROR"
}
```

Production output omits stack and internal message. A server-side diagnostic ID may correlate logs without exposing sensitive data.
