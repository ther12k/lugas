---
type: Architecture Specification
title: Bun-Native Testing Interface
status: draft
tags:
- testing
- bun
- integration
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Bun-Native Testing Interface

## Goal

Test the real compiled application with deterministic server lifecycle and no framework-specific mock router.

## Proposed API

```ts
import { createTestServer } from "lugas/testing";

using server = await createTestServer(app);

const response = await server.fetch(
  new Request("http://lugas.test/users/usr_123"),
);
```

The exact disposal syntax depends on Bun/TypeScript support. An explicit `await server.stop()` remains available.

## Behavior

`createTestServer`:

- starts the app on an ephemeral port or uses Bun's direct server fetch facility;
- returns the native server or a thin owner wrapper;
- exposes base URL and `fetch` convenience;
- guarantees idempotent stop;
- rejects leaked servers in tests where detectable;
- accepts server options needed by fixtures without allowing route replacement.

## Why not direct handler injection

Calling compiled handlers directly misses Bun route precedence, params, method behavior, static routes, fallback routing, and server error integration. Unit tests may exercise internals, but conformance and integration tests use a real Bun server path.

## Typed test client

The testing helper may compose with `createClient<typeof app>` by injecting `server.fetch` or the ephemeral base URL. This must not create a second client implementation.

## Test dimensions

- exact/static/param/wildcard routing;
- methods, automatic `HEAD`/`OPTIONS` behavior, and 405 semantics as Bun implements them;
- input parsing and validation;
- guard ordering and short-circuit;
- typed and raw responses;
- not-found and error boundary;
- abort/cancellation;
- concurrent requests and cleanup;
- browser-safe client behavior in a browser-like build.
