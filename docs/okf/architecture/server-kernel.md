---
type: Architecture Specification
title: Bun-Native Server Kernel
status: draft
tags:
- server
- kernel
- bun
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Bun-Native Server Kernel

## Responsibility

The server kernel turns validated application declarations into a `Bun.serve` options object. It owns declaration diagnostics and descriptor compilation; it does not own HTTP routing.

## Startup sequence

1. Freeze or snapshot application configuration.
2. Validate module names.
3. Flatten root and module route maps while preserving declared order for diagnostics only.
4. Enumerate every method/path pair.
5. Reject duplicate pairs before opening a port.
6. Classify route entries as native static response, native handler/method map, Bun directory/file form, or Lugas descriptor.
7. Compile each Lugas descriptor once.
8. Build the deterministic manifest.
9. Install unmatched-request and unexpected-error policies.
10. Call `Bun.serve` only from `app.serve`.

## Compiled handler variants

Avoid one generalized handler if simpler variants remove work:

- raw handler: no schemas and no guards;
- guard-only handler;
- params/query/header validation handler;
- JSON-body validation handler;
- combined validation + guards handler.

M1 may begin with a single readable composition function, but M1-010 must prove a synchronous fast path and M5 benchmarks decide whether specialization is warranted. Do not generate source code or use runtime `eval`.

## Server option ownership

`app.serve(options)` forwards supported Bun server options. Lugas owns and rejects caller replacement of:

- `routes`, because the app compiled them;
- `fetch`, except through the documented `notFound` policy;
- `error`, except through the documented `onError` policy.

Other options—port, hostname, development, idle timeout, max request body size, TLS, WebSocket callbacks, and Bun platform options—remain native where type-safe. The Bun version matrix determines exact availability.

## Not-found policy

When Bun invokes the fallback for an unmatched route, the default is a Problem Details 404 response. The policy receives the native `Request` and services if the type design can provide them without allocating generalized context. It must not attempt secondary route matching.

## Error policy

Unexpected thrown values are normalized internally. Development mode may include a safe diagnostic identifier; production defaults never expose stack traces, environment values, headers, or service objects. The policy returns a native response.

## Lifecycle and cleanup

`app.serve` returns the native Bun server. Lugas does not hide `stop`, `reload`, `requestIP`, `upgrade`, or other server functions. Testing helpers own ephemeral server cleanup; production application lifecycle remains the caller's responsibility.
