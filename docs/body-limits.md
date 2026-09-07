# Request Body Limits and Native Pass-Through

## Architecture Boundary

LugasJS delegates request body buffer limits and stream chunk management directly to the native Bun runtime:

1. **Bun Authority:** Server-level body constraints are configured via `Bun.serve({ maxRequestBodySize })` (or default runtime limits). Lugas does not duplicate or layer a secondary stream-counting abstraction over Bun.
2. **Declared JSON Routes:** When a route declares a `body` schema, Lugas reads the body stream once via `request.text()` and parses it as JSON. If the payload is oversized or aborted by Bun, the underlying abort/rejection propagates to the error policy boundary without leaking raw request fragments.
3. **Undeclared Routes (Pass-Through):** For routes without a `body` schema, Lugas performs zero stream reading or decoding. The native `request.body` (ReadableStream), `request.text()`, `request.formData()`, `request.blob()`, and `request.arrayBuffer()` remain fully available for direct handler access.
4. **Diagnostic Redaction:** Validation error responses and unexpected failure Problem Details never embed raw payload fragments or stack traces.

## Configuring the server ceiling

`app.serve()` accepts `maxRequestBodySize` (a number of bytes) and forwards it to `Bun.serve`:

```ts
const server = app.serve({ port: 3000, maxRequestBodySize: 1024 * 1024 });
```

This is a named, typed field of the serve options (`SafeServeOptions`). When it is not supplied, Bun's own runtime default applies — existing behavior is unchanged either way.

## Observed transport rejection (pinned behavior, Bun 1.4.x)

The ceiling is enforced by Bun **while consuming the body**, before Lugas parses, validates, or routes the request to a handler. On the supported Bun 1.4.x line this rejection is observed — and pinned by `tests/security/body-limits.test.ts` — as:

- **status `413` with an empty body**;
- **inclusive boundary:** a body of exactly `maxRequestBodySize` bytes is accepted; a larger body is rejected;
- **header-independent:** streamed requests without a `Content-Length` header are counted by consumed bytes and bounded by the same ceiling;
- **no handler execution:** a rejected request never reaches schema validation, the handler, or any application mutation;
- **outside the Lugas error envelope:** the `413` is a transport-level rejection produced before the framework sees a parseable request — it is *not* an RFC 9457 Problem Details response. Validation failures (for example malformed JSON on a declared-body route) remain Lugas `400` Problem Details responses; the two are distinct failure classes and are tested separately.

Client-side aborts while a body is still streaming are transport failures as well: the client observes its own abort error, and no fabricated response or handler execution occurs.

## Scope note

This document describes the **existing delegated ceiling only**. Application-default and route-specific body budgets are a separately gated feature defined by ADR-0019 (`docs/okf/decisions/0019-body-budget-policy.md`); they are not part of the current API.
