---
title: "Wire-honest types"
description: "How Lugas response types model JSON serialization truth."
---

# Wire-honest types

Lugas response types model what `JSON.stringify` actually puts on the wire, not the in-memory object type. The `Jsonify` contract mirrors ECMA-262 `SerializeJSONProperty` at compile time so the client's decoded type cannot silently disagree with what the server sends.

## Input vs output types

Client request types are derived from schema **input** types, while handlers receive schema **output** types. For transforming schemas this distinction matters:

```text
Client sends the wire input
          ↓
Schema validates and transforms
          ↓
Handler receives the transformed output
```

## What `Jsonify` models

| Source value | On the wire | Client type |
|---|---|---|
| `Date` | ISO string | `string` |
| `NaN` / `±Infinity` (non-finite number) | `null` | `number \| null` (finite literals stay exact) |
| `undefined`, function, `symbol` member | key omitted | optional key |
| Array element that serializes to `undefined` (incl. functions/symbols) | `null` | `null` in the element union |
| `toJSON()` method | invoked once per serialization position, with the property key when accepted | replacement value's wire type |
| `toJSON()` returning `undefined` (or a union containing it) | drop: key omitted / element `null` | optional key / `null` element |
| `bigint` at any position (incl. hook results) | **throws** | `never` (required) — a compile-time signal |
| `void`-only member | dropped | key removed |

Key semantics, verified against runtime probes:

- `toJSON` is invoked **at most once per serialization position**; a hook found on the replacement value is not re-entered at that position, but member/element positions restart the hook.
- Drop and throw are distinct outcomes. A position that serializes by throwing stays a required `never` — it never collapses into an omitted key or `null`.
- Possibly-dropped members become true **optional** properties, not required keys padded with `undefined`.

```ts
json(200, { createdAt: new Date() });
// client observes: { createdAt: string }

json(200, { ratio: maybeNaN }); // number
// client observes: { ratio: number | null }
```

## Media-type ownership

Response helpers own their media types so the type brand and the client's decoding behavior cannot disagree:

| Helper | Owned media type |
|---|---|
| `json(status, body)` | `application/json`, `application/*+json`, `*+json` |
| `text(status, body)` | `text/*` |
| `problem(status, problem)` | `application/problem+json` |
| `empty(status)` | no body |

Explicit `Content-Type` overrides that contradict the owned type throw at construction (`LUGAS_RESPONSE_001`–`005`, see [`diagnostics.md`](/lugas/diagnostics/)); compatible overrides keep caller precedence.

## Beta boundary

Explicit limitations, accepted for the beta scope: prototype and enumerability are approximated (not modeled), cyclic structures are unsupported (runtime throws), and `problem()` bodies are not Jsonified (they are taken as written). Pre-1.0 refinements to the model are tracked in [`docs/reports/`](https://github.com/ther12k/lugas/tree/main/docs/reports/) and the [changelog](https://github.com/ther12k/lugas/blob/main/CHANGELOG.md).
