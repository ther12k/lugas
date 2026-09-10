---
type: Guide
title: Typed Client
status: current
tags:
- guide
- client
- end-to-end-types
---

# Typed client

`lugas/client` turns your **application type** into a browser-safe HTTP client. There is no code generation, no runtime `Proxy`, and no object-tree RPC façade: the client uses explicit method calls with path strings, checked against the contract your routes already declare.

## From app type to client

```ts
// shared-contract.ts (or anywhere both sides can import)
import type { AppContract } from "lugas";
import type app from "./app";

export type API = AppContract<typeof app>;
```

```ts
// frontend.ts
import { createClient } from "lugas/client";
import type { API } from "./shared-contract";

const api = createClient<API>({ baseUrl: "https://api.example.com" });
```

`createClient` takes two options: `baseUrl` (string or `URL`; trailing slashes normalized) and an optional `fetch` transport override (defaults to the global `fetch` captured at creation time — useful for auth wrappers and test doubles).

## Calling routes

Each HTTP method is an explicit call. Inputs and outputs are checked against the contract:

```ts
// Path params — keys and types come from the route's declared params schema
const r1 = await api.get("/users/:id", { params: { id: "usr_123" } });

// Query — checked against the route's query schema output
const r2 = await api.get("/search", { query: { q: "lugas", page: 2 } });

// Body — checked against the route's body schema output
const r3 = await api.post("/invoices", {
  body: { amount: 125, currency: "USD" },
  headers: { authorization: "Bearer token" },
});
```

Unsupported paths and methods are **compile errors** — `api.get("/nope")` does not type-check. For genuinely dynamic calls there is a typed escape hatch, `api.request(method, path)`, which returns the raw `Response` and never weakens the canonical methods.

## The result type

Every call resolves to a **discriminated union per status** — the ok/error split carries the payload types your handler actually returns:

```ts
const result = await api.post("/invoices", { body: { amount: 125, currency: "USD" } });

if (result.ok) {
  result.status;  // 201 (the literal)
  result.data;    // the Jsonify'd success body — exactly what the wire carries
  result.response; // the native Response (headers, etc.)
} else {
  result.status;  // the literal error status (422, 401, …)
  result.error;   // the error body — e.g. the Problem Details fields
  result.response;
}
```

What `result.data` says is **wire truth**, derived from the server handler's `json()` body type: `Date` fields are `string`, non-finite numbers are `number | null`, possibly-dropped members are optional. See [`wire-honest-types.md`](./wire-honest-types.md) for the full model.

## Error classes

The client's own failures are typed classes, distinct from HTTP failures:

| Class | Raised when |
|---|---|
| `ClientPathError` | A path template is malformed or params are missing/mismatched at call time. |
| `ClientQueryError` | Query serialization fails (bad values). |
| `ClientRequestError` | The transport itself fails (network error, invalid request). |
| `ClientDecodeError` | The response body cannot be parsed per the media-type policy. |

These cover *client-side* faults. An HTTP error response (`4xx`/`5xx`) is **not** an exception — it is the `ok: false` branch. Redaction and parsing rules for error bodies are specified in [`client-error-semantics.md`](./client-error-semantics.md).

## Running in the browser without a bundler

The package ships a prebuilt browser ESM artifact under `lugas/client/browser` (`build/lugas-client.esm.js`). The `.ts` sources remain the only type source of truth. Three arrangements are documented in [getting started](./getting-started.md#using-the-client-without-a-build-step): same-origin asset serving, an import map, or your existing bundler.

## SSE and streaming

The client's typed methods cover request/response routes. Server-Sent Events endpoints ([`sse.md`](./sse.md)) are consumed with the platform's `EventSource` — Lugas does not wrap streams into the typed-result union.

## Where next

- [Client error semantics](./client-error-semantics.md) — media-type policy, body parsing, redaction.
- [Testing](./testing.md) — the test server exposes this same real client against your app.
- [Responses](./responses.md) — how handler status/body pairs shape the union you consume.
