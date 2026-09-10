---
type: Guide
title: Validation
status: current
tags:
- guide
- validation
- standard-schema
---

# Validation

Lugas validates request data through [Standard Schema v1](https://standardschema.dev) — the vendor-neutral validator interface. Any conforming implementation works: **Zod**, **Valibot**, **ArkType**, or your own. Lugas never imports a validator; the schema you pass is the schema that runs.

## The four schema slots

A route declares schemas per request slot:

```ts
import { z } from "zod";
import { route, json } from "lugas";

route({
  params:  z.object({ id: z.coerce.number().int().positive() }),
  query:   z.object({ expand: z.enum(["user", "team"]).optional() }),
  headers: z.object({ "x-api-version": z.string().min(1) }),
  body:    z.object({ name: z.string().min(2), email: z.string().email() }),
  handler: (ctx) => json(201, { id: ctx.params.id, ...ctx.body }),
});
```

| Slot | Wire source | Context property | Notes |
|---|---|---|---|
| `params` | path segments | `ctx.params` | Raw values are strings; declare coercion explicitly to get numbers. Output type is the validator's **transformed output**. |
| `query` | URL query string | `ctx.query` | Values arrive as strings; use `z.coerce.*` (or Valibot `transform`) for numbers/booleans. |
| `headers` | request headers | `ctx.headers` | Header names are lowercase on the wire — schema keys must be lowercase (`"x-api-version"`). |
| `body` | JSON request body | `ctx.body` | Parsed by the framework; see media-type rules below. |

Undeclared slots still exist on the context, typed `| undefined`, so accidental reads are visible to TypeScript without breaking `exactOptionalPropertyTypes`.

## Coercion is explicit

The wire carries only strings. Lugas does not guess: `?page=2` is the string `"2"` unless your schema coerces it.

```ts
query: z.object({
  page: z.coerce.number().int().positive().default(1),   // ✅ number on ctx.query
  // page: z.number(),                                   // ❌ 422 — "2" is not a number
})
```

Defaults work as your validator intends: `.default(1)` fills the value before it reaches the handler, and the output type reflects it.

## Request bodies

Declaring `body` opts the route into framework body parsing:

- **Media type**: `application/json` is parsed; other content types are rejected with `415` (`UNSUPPORTED_MEDIA_TYPE`) before your handler runs.
- **Malformed JSON** fails with `400` (`MALFORMED_JSON`).
- **Validation failure** fails with `422` (`VALIDATION_FAILED`).
- Both limits interact: a route with a `body` participates in the [body budget](./body-limits.md) system — `defineApp({ bodyBudget })` sets the app default, `route({ budget })` overrides per route, and `serve({ maxRequestBodySize })` is the transport ceiling that always wins. Over-budget requests die with `413` Problem Details (`BODY_BUDGET_EXCEEDED`) before validation.

## The failure contract

Validation failures return RFC 9457 Problem Details with status `422` and the `VALIDATION_FAILED` code. The failing slot is named in `source`, and validator issues are normalized into bounded extension members:

```json
{
  "type": "https://lugasjs.dev/problems/validation",
  "title": "Request validation failed",
  "status": 422,
  "code": "VALIDATION_FAILED",
  "source": "body",
  "issues": [
    { "path": ["email"], "message": "Invalid email address" }
  ]
}
```

- `source` is one of `"params" | "query" | "headers" | "body"`.
- `issues[].path` is relative to that source (`["email"]`, not `["body", "email"]`), carrying only string/number segments.
- Normalization is bounded and denylisted: at most 50 issues, messages capped at 500 chars, and leak-capable keys (`input`, `value`, `schema`, `cause`, …) are stripped. Validator internals never reach the client.

Malformed JSON (`400`, `MALFORMED_JSON`) and unsupported media types (`415`, `UNSUPPORTED_MEDIA_TYPE`) use the same Problem Details envelope with their own `type` URIs. The response is produced by the framework — handlers never see invalid data, so handler code contains no re-validation branches.

## What the handler receives

The context slot types are **derived from the declared schemas** — there is no manual annotation step and no drift between the schema and the type:

```ts
route({
  query: z.object({ page: z.coerce.number().default(1) }),
  handler: (ctx) => {
    ctx.query.page; // number — required, defaulted, validated
    return json(200, { page: ctx.query.page });
  },
})
```

This is the same derivation the compiled pipeline executes: declared slot → validate → assign output. What the type says is what the pipeline guarantees.

## Validator feature detection

Lugas feature-detects `~standard.jsonSchema` and never guesses shapes from vendor names. A validator without a JSON Schema representation documents **presence only** in [OpenAPI](./openapi.md) (e.g. a query parameter marked required, a body typed `object`) — structure is never invented. Validators that expose JSON Schema have it used verbatim.

## Picking a validator

Any Standard Schema v1 implementation works, per application choice:

```ts
// Zod
params: z.object({ id: z.coerce.number() })

// Valibot
params: v.object({ id: v.pipe(v.string(), v.transform(Number), v.integer()) })
```

Mixing validators across routes is fine — each slot is independent. The compatibility matrix records verified combinations in [`compatibility.md`](./compatibility.md).

## Where next

- [Routing](./routing.md) — where schemas attach and what the route map accepts.
- [Guards](./guards.md) — enrichment runs after validation in the compiled pipeline order.
- [Responses](./responses.md) — the `422` envelope and the rest of the error policy.
