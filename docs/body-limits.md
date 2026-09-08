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

## Body budgets (M7-003, ADR-0019 as amended)

Routes that declare a framework-parsed `body` may enforce a Lugas-level budget, layered under the delegated ceiling:

- Selection: `effectiveBudget = min(serverCeiling, route.budget ?? app.bodyBudget)`. A route `budget` relaxes the application default (`defineApp({ bodyBudget })`), never the ceiling.
- Startup rejection: a budget above an explicitly configured `maxRequestBodySize` fails at `serve()` (`LUGAS_BODY_003`); budgets on routes without a declared `body` are rejected at `defineApp()` (`LUGAS_BODY_002`, the accepted narrower form — no silently inert budgets); invalid shapes fail at definition (`LUGAS_BODY_001`).
- Enforcement point: bounded consumption — a `Content-Length` above the budget rejects without reading; chunked bodies are counted byte-by-byte and all further reads stop at overflow. The oversized request never reaches schema validation or the handler.
- Rejection envelope: the Lugas-level rejection is `413` **Problem Details** (`BODY_BUDGET_EXCEEDED`) — deliberately distinct from the bare, empty-body transport `413` the delegated ceiling produces. Both are pinned side by side in `tests/security/body-budgets.test.ts`.
- No configuration → existing server-ceiling behavior, byte-for-byte unchanged (regression-tested).

## Scope note

Without an explicit `maxRequestBodySize`, Bun's runtime default remains the ceiling and budgets enforce as configured (clamping against an unknown ceiling is not claimed).
