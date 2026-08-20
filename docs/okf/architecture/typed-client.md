---
type: Architecture Specification
title: Explicit Eden-Like Typed Fetch Client
status: draft
tags:
- client
- typed-fetch
- eden-like
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Explicit Eden-Like Typed Fetch Client

## Decision

Lugas provides Eden-like end-to-end safety but does not depend on Eden and does not begin with Treaty-style Proxy/tree syntax.

## API

```ts
import { createClient } from "lugas/client";
import type { API } from "./server";

const api = createClient<API>({
  baseUrl: "https://api.example.com",
});

const result = await api.get("/users/:id", {
  params: { id: "usr_123" },
  headers: { authorization: "Bearer ..." },
});

if (result.ok) {
  console.log(result.data);
} else if (result.status === 404) {
  console.log(result.error.code);
}
```

## Client methods

Expose explicit lower-case methods for supported HTTP verbs. Each method accepts only paths that support that verb. A generic `request` escape hatch may exist if it does not weaken method-specific inference.

## Input object

```ts
{
  params?: ...;
  query?: ...;
  headers?: ...;
  body?: ...;
  init?: Omit<RequestInit, "method" | "body" | "headers"> & { ... };
}
```

- Path params are encoded segment-by-segment.
- Query serialization mirrors server query semantics: arrays become repeated keys, empty strings are preserved, `undefined` is omitted, and arbitrary objects are rejected unless the schema contract expects them and a policy is documented.
- Declared JSON body is serialized with the JSON content type unless caller headers create a documented conflict.
- `RequestInit` remains available for signal, credentials, cache, redirect, and platform extensions.

## Result model

```ts
type Success<S, B> = {
  ok: true;
  status: S;
  data: B;
  response: Response;
};

type Failure<S, B> = {
  ok: false;
  status: S;
  error: B;
  response: Response;
};
```

HTTP status determines success according to `Response.ok`. Known status/body unions narrow precisely. Unknown raw responses widen safely.

## Parsing

- 204/205 and bodyless responses return the declared empty representation.
- JSON and Problem Details parse as JSON.
- text responses parse as text.
- unknown media types may expose `Response` and `unknown` rather than guessing.
- malformed declared JSON is a client decode error with the original response attached; exact throw/result policy is frozen by M3-012.

## Failure semantics

Network, TLS, DNS, abort, and injected-fetch failures behave like normal `fetch` and throw. HTTP 4xx/5xx responses do not throw; they return `ok: false`.

## Browser boundary

`lugas/client` may import type-only server declarations but no runtime Bun module. Browser smoke tests bundle it in an environment where `Bun` is absent.

## Future tree client

A Proxy/tree façade may be explored after beta as a separate export built over the same contract. It must pass type-cost and path-collision benchmarks and cannot become the canonical syntax merely because it is shorter.
