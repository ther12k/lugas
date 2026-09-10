---
title: "Testing"
description: "Real pipeline tests with createTestServer and the bound typed client."
---
`lugas/testing` runs your real application — full pipeline: validation, guards, CORS, logging, error policy — against an ephemeral Bun server. Nothing is mocked by default: if a test passes here, the wire behavior is real.

## createTestServer

```ts
import { expect, test } from "bun:test";
import { createTestServer } from "lugas/testing";
import app from "./app";

test("creates an invoice", async () => {
  const server = createTestServer(app, { port: 0 });   // 0 = ephemeral port (default)

  try {
    const response = await server.fetch("/invoices", {
      method: "POST",
      headers: {
        authorization: "Bearer test-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ amount: 125, currency: "USD" }),
    });

    expect(response.status).toBe(201);
  } finally {
    await server.stop();
  }
});
```

| Member | Purpose |
|---|---|
| `port` / `url` | Resolved ephemeral port and base URL (no trailing slash). |
| `fetch(input, init?)` | Fetch against this server. Relative paths resolve against the base URL; absolute URLs and `Request` inputs pass through. |
| `client` | The **real** `lugas/client` client bound to this server — typed from your app contract, no testing clone. |
| `stop()` / `dispose()` | Idempotent, force-closes connections; safe in `finally` after failures. |

Options: `port` (default ephemeral), `hostname`, `development`.

## Testing with the typed client

`server.client` is the same implementation `lugas/client` ships, pointed at the test server. End-to-end contract tests need no URL plumbing:

```ts
test("client sees the typed result", async () => {
  const server = createTestServer(app);   // server.client is typed from the app automatically

  try {
    const result = await server.client.post("/invoices", {
      body: { amount: 125, currency: "USD" },
    });
    if (result.ok) {
      expect(result.data.amount).toBe(125);
    } else {
      expect.unreachable();
    }
  } finally {
    await server.stop();
  }
});
```

## Testing the validation and error contract

Framework errors are part of the contract — assert them like behavior, not like accidents:

```ts
test("rejects an invalid body with 422 Problem Details", async () => {
  const server = createTestServer(app);
  try {
    const response = await server.fetch("/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer test-token" },
      body: JSON.stringify({ amount: -5, currency: "US" }),
    });

    expect(response.status).toBe(422);
    expect(response.headers.get("content-type")).toBe("application/problem+json");

    const problem = await response.json();
    expect(problem.code).toBe("VALIDATION_FAILED");
    expect(problem.source).toBe("body");
  } finally {
    await server.stop();
  }
});
```

The same pattern covers guard order (401 before 403, short-circuit skips the handler), redacted 500s (assert the status and the *absence* of internals — never assert on stack text), CORS preflights, and body budgets (`413`).

## Testing services and disposal

`createTestServer.stop()` **force-closes** connections — by design it does not run service disposal, so tests that assert lifecycle need the real serve path:

```ts
test("disposes the database on shutdown", async () => {
  const server = app.serve({ port: 0 });
  await server.lugasLifecycle.ready;      // all service init settled

  const outcome = await server.lugasLifecycle.shutdown();

  expect(outcome.disposalCompleted).toBe(true);
});
```

`lugasLifecycle.ready` gates on every `init`; `shutdown()` is idempotent and reports `connectionsClosed`, `trackedWorkCompleted`, `disposalCompleted`, and `disposalFailures` distinctly. See [services](/lugas/services/) for the phase semantics.

## What to test through the server

The testing package is intended for:

- route integration tests (real status/media-type bodies),
- validation tests (schema → `422` shapes),
- guard-order tests (enrichment and short-circuits),
- error-contract tests (Problem Details, redaction),
- application lifecycle tests (init gate, drain, disposal).

For pure functions — schemas, guard enrichment logic, helpers — keep using ordinary unit tests; the server adds value exactly where the pipeline is involved.

## Where next

- [Services](/lugas/services/) — lifecycle semantics being asserted above.
- [Diagnostics](/lugas/diagnostics/) — what each `LUGAS_*` code means when a test surfaces one.
- [`examples/`](https://github.com/ther12k/lugas/blob/main/examples/README.md) — runnable single-concept apps to copy from.
