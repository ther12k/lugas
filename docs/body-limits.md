# Request Body Limits and Native Pass-Through

## Architecture Boundary

LugasJS delegates request body buffer limits and stream chunk management directly to the native Bun runtime:

1. **Bun Authority:** Server-level body constraints are configured via `Bun.serve({ maxRequestBodySize })` (or default runtime limits). Lugas does not duplicate or layer a secondary stream-counting abstraction over Bun.
2. **Declared JSON Routes:** When a route declares a `body` schema, Lugas reads the body stream once via `request.text()` and parses it as JSON. If the payload is oversized or aborted by Bun, the underlying abort/rejection propagates to the error policy boundary without leaking raw request fragments.
3. **Undeclared Routes (Pass-Through):** For routes without a `body` schema, Lugas performs zero stream reading or decoding. The native `request.body` (ReadableStream), `request.text()`, `request.formData()`, `request.blob()`, and `request.arrayBuffer()` remain fully available for direct handler access.
4. **Diagnostic Redaction:** Validation error responses and unexpected failure Problem Details never embed raw payload fragments or stack traces.
