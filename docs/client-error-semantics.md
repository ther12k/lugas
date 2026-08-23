---
type: Reference
title: Client Error and Response-Format Semantics
status: frozen
tags:
- client
- errors
- response-formats
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Client Error Semantics (frozen by M3-012)

This document is the canonical description of how the Lugas typed client
classifies wire responses. The runtime in `src/client/parse-response.ts` and
`src/client/errors.ts` implements exactly this table.

## Result model

Every canonical method call resolves to one of:

```ts
{ ok: true;  status: S; data: B;  response }   // S in 200..299 (Response.ok)
{ ok: false; status: S; error: B; response }   // everything else
```

The branch follows the **actual** response, never the compile-time contract:
a route declared to return 200 that responds 500 produces `ok: false`
keyed by 500.

## Wire-form table

| Wire form | Slot | Value |
|---|---|---|
| `application/json`, `application/*+json` (incl. `application/problem+json`) on 2xx | `data` | parsed JSON |
| same media on non-2xx | `error` | parsed JSON (Problem Details appear here) |
| `text/*` | `data` / `error` | decoded string |
| no `content-type` header | `data` / `error` | `undefined`; body left unconsumed |
| bodiless statuses `204`, `205`, `304` | `data` / `error` | `undefined`; JSON parsing never attempted even if a content type is present |
| unknown media types (e.g. `application/octet-stream`) | slot | `undefined`; body never consumed — read it via `result.response` |
| redirects | normal fetch semantics | followed automatically; a manually surfaced redirect classifies by its real status (`Response.ok`) |

The declared content type is authoritative for the parse choice; a server
sending JSON under `text/plain` yields a string.

## Decode-failure policy (frozen)

When a recognized JSON body cannot be parsed, the call throws:

```ts
class ClientDecodeError extends Error {
  code: "LUGAS_CLIENT_010";
  status: number;
  contentType: string | null;
  response: Response;   // untouched original (clone body policy)
}
```

Rationale:

1. Decode failure is a contract violation from a nonconforming server, not
   an HTTP outcome — so it must not masquerade as `data`/`error` payload.
2. Throwing keeps happy-path result payloads exactly as declared.
3. The original response stays attached and readable (bodies are parsed from
   a clone), giving full manual access when needed.

Error messages never contain response-body content.

## Stable diagnostic codes

| Code | Raised by | Meaning |
|---|---|---|
| `LUGAS_CLIENT_001` | path | missing/undefined/null path parameter |
| `LUGAS_CLIENT_002` | path | undeclared extra parameter |
| `LUGAS_CLIENT_003` | path | invalid parameter value or shape |
| `LUGAS_CLIENT_004` | path | ambiguous duplicate declaration |
| `LUGAS_CLIENT_005` | path | invalid route template |
| `LUGAS_CLIENT_006` | query | query value policy violation |
| `LUGAS_CLIENT_007` | request | platform options own an owned field |
| `LUGAS_CLIENT_008` | request | body serialization/content-type conflict |
| `LUGAS_CLIENT_009` | request | invalid header name/value |
| `LUGAS_CLIENT_010` | decode | malformed declared JSON |

Codes `001`–`009` throw before any network dispatch; `010` throws after a
response arrives.

## Guarantees

- Header values are never included in diagnostic messages.
- Network, TLS, DNS, abort, and injected-fetch failures behave like plain
  `fetch` (throw); they are never wrapped or swallowed (M3-013).
- The generic `request()` escape hatch returns the raw `Response` unparsed.
