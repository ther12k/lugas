---
title: "Responses and errors"
description: "Typed response helpers, wire-honest bodies, RFC 9457 errors, notFound/onError."
---
Handlers return real `Response` objects. Lugas adds four typed helpers, compile-time status/body facts, an RFC 9457 error policy, and two application hooks (`notFound`, `onError`). Nothing wraps or replaces the native `Response` — helpers return one.

## Typed response helpers

| Helper | Body | Media type |
|---|---|---|
| `json(status, body, init?)` | any JSON-serializable value | `application/json` |
| `text(status, body, init?)` | string | `text/plain;charset=utf-8` |
| `problem(status, fields, init?)` | RFC 9457 fields | `application/problem+json` |
| `empty(status, init?)` | — (no body) | — |
| `redirect(location, status?)` | — | `302` default; `RedirectStatus` set (301/302/303/307/308) |

Each helper returns a `TypedResponse<S, B>` — a genuine `Response` carrying a **phantom brand** with the status and body type. The brand is optional and non-enumerable: the object satisfies `Response` everywhere, and the runtime object is the native response.

Media types are owned: `problem()` throws at construction (`LUGAS_RESPONSE_003`) if you override its content type with anything other than `application/problem+json`, and the JSON helpers enforce theirs symmetrically.

## Wire-honest response types

`json(status, body)` types the body as `Jsonify<B>` — a compile-time mirror of what `JSON.stringify` actually puts on the wire, not of the in-memory value:

```ts
json(200, { createdAt: new Date(), score: NaN, tag: undefined });
// client sees:
// { createdAt: string; score: number | null }   — "tag" is dropped
```

- `Date` arrives as `string`, never a pretend `Date`.
- `NaN` / `±Infinity` widen to `number | null` (they serialize as `null`).
- Members that may serialize to `undefined` become **optional** properties; array elements would become `null`.
- `bigint` anywhere makes `JSON.stringify` throw — typed as a throw signal (`never`), never conflated with a drop.

The full model (including `toJSON` hook semantics) is specified in [`wire-honest-types.md`](/lugas/wire-honest-types/).

## Problem Details (RFC 9457)

`problem(status, fields)` builds `application/problem+json` responses. `type`, `title`, `detail`, and `instance` are the standard members; extension members pass through (string/number/boolean values are simplest to keep bounded):

```ts
import { problem } from "lugas";

return problem(409, {
  type: "https://api.example.com/problems/over-limit",
  title: "Usage limit exceeded",
  detail: "Invoice quota for this billing period is exhausted",
  instance: new URL(ctx.request.url).pathname,
  currentUsage: 512,
});
```

Framework errors use the same envelope with stable `type` URIs and `code` members: validation (`422 VALIDATION_FAILED`), malformed JSON (`400 MALFORMED_JSON`), unsupported media type (`415 UNSUPPORTED_MEDIA_TYPE`), body budget (`413 BODY_BUDGET_EXCEEDED`). See [validation](/lugas/validation/) for the exact shapes.

## notFound and onError

Two app-level hooks own the two fallback paths:

```ts
import { defineApp, json, problem } from "lugas";

export default defineApp({
  routes: { /* … */ },
  notFound: (request) =>
    json(404, { error: "no such route", path: new URL(request.url).pathname }),
  onError: (error, request) => {
    // log the error with your own machinery — see docs/logging.md
    return problem(500, { title: "Internal Server Error" });
  },
});
```

- `notFound` runs for unmatched paths (asset misses keep their plain asset 404 — distinguishable from API misses).
- `onError` runs when a handler or guard throws. **The default policy is redaction**: an unhandled error becomes a redacted `500` Problem Details — no stack traces, no error messages, no internals reach the client. Replacing `onError` is your escape hatch, and your responsibility: whatever you return is what the client sees.
- Both hooks must be functions (`LUGAS_APP_002` otherwise) and are captured at `defineApp()` time like everything else.

## Status discipline

Statuses are explicit arguments, never inferred. The compile-time pairing matters most on the client side: a route handler returning `json(201, …)` on success and `problem(422, …)` on failure produces a client whose `result.ok` narrows **both** the status and the payload type. Deliberately-NOT: automatic status mapping from exception classes, global exception → status registries, or string-typed statuses.

## Where next

- [Client error semantics](/lugas/client-error-semantics/) — how `lugas/client` parses failures and redacts.
- [Validation](/lugas/validation/) — the `400`/`415`/`422`/`413` framework-produced errors.
- [Body limits](https://github.com/ther12k/lugas/blob/main/docs/body-limits.md) — budgets, ceilings, and the `413` boundary.
