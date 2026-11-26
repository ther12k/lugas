---
title: "Typed client"
description: "Browser-safe end-to-end typed calls with per-status results."
---
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

## Headers: the declared schema is the only channel

Two consequences of that design bite real code (dogfood findings RF-4/RF-5):

**A route that declares a `headers` schema makes the options argument required.** The headers map is the only way to send headers, so the compiler insists you acknowledge it — even when every declared header is optional and you have nothing to send, the call needs an explicit empty object:

```ts
// Route declares headers: z.object({ cookie: z.string().optional() })
const r = await api.get("/me", { headers: {} }); // nothing to send — idiom, not noise
```

**The typed call has no input for undeclared headers.** This constraint applies to caller-supplied options, not headers the transport adds. The typed call owns `method`, `body`, and `headers`; passing those through platform options (`init`) throws `LUGAS_CLIENT_007` at the call site rather than silently contradicting the contract. This is deliberate strictness — an undeclared header is invisible to the route's contract and to every consumer of its types.

### Sending cookies

To forward a session cookie explicitly from server-side code, declare `cookie` in the route's header schema. A browser-managed cookie does not need a schema slot to travel on the wire.

```ts
// Route side
const cookieHeader = z.object({ cookie: z.string().optional() });
route({ headers: cookieHeader, before: [session], /* … */ });

// Client side (server runtimes) — forward the session cookie as a declared header
const me = await api.get("/me", { headers: { cookie: "session=…" } });
```

The client has **no built-in cookie jar**. The Bun example (`examples/realworld/client.ts`) reads the single session cookie from the login response and forwards only its `name=value` pair to the same API, not the `Set-Cookie` attributes.

In a browser, [`Cookie` is a forbidden request header](https://fetch.spec.whatwg.org/#forbidden-header-name). Let the browser attach eligible cookies. For the route above, a cross-origin call uses `api.get("/me", { headers: {}, init: { credentials: "include" } })`; the empty map does not clear the browser's jar. Cookie rules still apply, and the API must allow credentialed CORS for the caller to read the response. For browser WebSocket authentication, see [`websockets.md`](/lugas/websockets/).

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

What `result.data` says is **wire truth**, derived from the server handler's `json()` body type: `Date` fields are `string`, non-finite numbers are `number | null`, possibly-dropped members are optional. See [`wire-honest-types.md`](/lugas/wire-honest-types/) for the full model.

### Framework-generated failures in the union

The union is not only handler and guard outcomes. Routes that **declare schemas** can be rejected by the framework before any handler runs, and those outcomes are part of the contract:

| Route declares… | Added to the union |
|---|---|
| any schema slot (`params`, `query`, `headers`, `body`) | `422` `VALIDATION_FAILED` |
| a `body` schema (JSON) | `415` `UNSUPPORTED_MEDIA_TYPE`, `400` `MALFORMED_JSON` |
| a [`form()`](/lugas/uploads/) body | `415` `UNSUPPORTED_MEDIA_TYPE`, `400` `MALFORMED_MULTIPART`, `413` `FORM_LIMIT_EXCEEDED`/`BODY_BUDGET_EXCEEDED` (Problem body) |

Each failure branch carries the Problem Details document the framework emits (`code` is the literal failure kind, `issues` the normalized validation issues). Routes that declare no schemas gain nothing.

Two honest boundaries:

- **413 is not in the union for JSON-schema routes.** Whether a body budget applies (route `budget`, app default, serve ceiling) is runtime configuration, and an out-of-union status still arrives safely: the runtime branch follows the actual response, and the result always carries `status`, the decoded payload slot, and `response`.
- **The transport ceiling can bare-413 `form()` routes too.** Lugas-level 413s (`FORM_LIMIT_EXCEEDED`, `BODY_BUDGET_EXCEEDED`) always carry a Problem body, but Bun's `maxRequestBodySize` can reject the same request before the framework sees it — empty body, no Problem document. The multipart `413` branch therefore types its payload as **absentable** (`…ProblemBody | undefined`): narrow before reading Problem fields, and never assume `status: 413` alone identifies the rejection's origin. The decoder never manufactures a body. That rejection is Bun's alone, so it carries no CORS headers either — a cross-origin browser caller cannot read it and gets a failed request rather than a `413`.

### Multipart uploads through the typed client

Routes whose body is [`form()`](/lugas/uploads/) take a `formBody()` wrapper — the explicit runtime discriminator that selects the multipart encoder (the contract is erased at dispatch, so generics alone cannot pick the encoder):

```ts
import { formBody } from "lugas/client";

const res = await api.post("/upload", {
  body: formBody({
    note: "quarterly report",
    attachments: [new File([bytes], "q3.pdf", { type: "application/pdf" }), new File([bytes], "q4.pdf")],
  }),
});
if (res.ok) res.data;          // the handler's typed json() body
if (!res.ok) res.error?.code;  // undefined for a bare transport 413
```

- Native `File`/`Blob` values are preserved as parts; scalars stringify; a flat array sends one part per element under the same field name (nested arrays are rejected).
- The **platform generates the boundary**: the client never sets `content-type`, and a caller-supplied content type is a conflict (`LUGAS_CLIENT_008`).
- Cancellation and every other platform option behave exactly as on JSON calls.

## Error classes

The client's own failures are typed classes, distinct from HTTP failures:

| Class | Raised when |
|---|---|
| `ClientPathError` | A path template is malformed or params are missing/mismatched at call time. |
| `ClientQueryError` | Query serialization fails (bad values). |
| `ClientRequestError` | The transport itself fails (network error, invalid request). |
| `ClientDecodeError` | The response body cannot be parsed per the media-type policy. |

These cover *client-side* faults. An HTTP error response (`4xx`/`5xx`) is **not** an exception — it is the `ok: false` branch. Redaction and parsing rules for error bodies are specified in [`client-error-semantics.md`](/lugas/client-error-semantics/).

## Running in the browser without a bundler

The package ships a prebuilt browser ESM artifact under `lugas/client/browser` (`build/lugas-client.esm.js`). The `.ts` sources remain the only type source of truth. Three arrangements are documented in [getting started](/lugas/getting-started/#using-the-client-without-a-build-step): same-origin asset serving, an import map, or your existing bundler.

## SSE and streaming

The client's typed methods cover request/response routes. Server-Sent Events endpoints ([`sse.md`](/lugas/sse/)) are consumed with the platform's `EventSource` — Lugas does not wrap streams into the typed-result union.

## Where next

- [Client error semantics](/lugas/client-error-semantics/) — media-type policy, body parsing, redaction.
- [Testing](/lugas/testing/) — the test server exposes this same real client against your app.
- [Responses](/lugas/responses/) — how handler status/body pairs shape the union you consume.
