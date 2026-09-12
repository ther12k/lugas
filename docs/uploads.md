---
type: Guide
title: File Uploads
status: current
tags:
- guide
- multipart
- uploads
- body-budget
---

# File uploads

`form()` is a first-party body codec for `multipart/form-data`: **bounded** by the [body budget](./body-limits.md) (the raw body is refused at the cap *before* parsing), parsed by the platform's `FormData` implementation (Lugas ships no MIME parser), and delivered to handlers as plain maps with **native `File` values**. See [ADR-0030](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0030-multipart-forms.md).

## Declaring an upload route

```ts
import { form, json, route } from "lugas";

route({
  body: form({
    maxFields: 32,            // text parts (default 64)
    maxFiles: 4,              // file parts (default 16)
    maxFileSize: 5 * 1024 * 1024,  // per-file bytes (default 10 MiB)
  }),
  handler: (ctx) => {
    ctx.body.fields;  // Record<string, string> — text parts
    ctx.body.files;   // Record<string, File>  — native File: .name .type .size .stream() .arrayBuffer()
    return json(201, { saved: Object.keys(ctx.body.files) });
  },
});
```

`body: form(...)` occupies the ordinary body slot: the manifest records the body capability, `ctx.body` is typed from the descriptor, and every framework error path applies (Problem Details, redaction, [logging](./logging.md), [CORS](./cors.md), [secure headers](./production.md)).

## Bounded consumption

The battery's point: uploads are the heaviest request class, so they are held to the [body budget](./body-limits.md) like every framework-parsed body:

1. A `Content-Length` above the effective budget is refused **before reading** — `413 BODY_BUDGET_EXCEEDED`.
2. Otherwise the body is read stream-wise; crossing the cap aborts the read — `413`, never a partial parse.
3. Only bytes within the cap ever reach a parser.

The effective budget is the usual composition: app `bodyBudget` default, per-route `budget` override, `serve({ maxRequestBodySize })` ceiling that always wins.

## Limits

| Config | Default | Exceeded |
|---|---|---|
| `maxFields` | 64 | `413 FORM_LIMIT_EXCEEDED` |
| `maxFiles` | 16 | `413 FORM_LIMIT_EXCEEDED` |
| `maxFileSize` | 10 MiB (per file) | `413 FORM_LIMIT_EXCEEDED` |

Limits are positive integers validated at `form()` creation (`LUGAS_FORM_001` on violations, including unknown keys). Byte overruns and shape overruns are both `413` — "too large" — with distinct `code` values (`BODY_BUDGET_EXCEEDED` vs `FORM_LIMIT_EXCEEDED`) so clients can tell which bound fired.

## Multiplicity: repeated part names

By default, repeated part names collapse **last-wins** (`fields`/`files`), mirroring [`parseCookies`](./cookies.md) — the M9-005 contract, unchanged. Uploads that legitimately repeat a field name (an ordinary `multiple` file input) can opt into an additional per-name view:

```ts
body: form({ repeated: "preserve" })
```

The handler body then also carries `groups`: every part per name, in wire order — `ctx.body.groups.attachments` is `Array<string | File>`. `fields`/`files` stay last-wins in both modes; the default is never changed silently.

## Sending from the typed client

`form()` routes are end-to-end typed: the client call takes a [`formBody()`](./client.md#multipart-uploads-through-the-typed-client) wrapper, the platform generates the boundary, and the route's failure contract below appears as typed failure branches in the client result union.

## Failure contract

| Condition | Status | Code |
|---|---|---|
| Non-multipart content type (or missing boundary) | `415` | `UNSUPPORTED_MEDIA_TYPE` |
| Unparseable multipart body | `400` | `MALFORMED_MULTIPART` |
| Byte budget exceeded (header or stream) | `413` | `BODY_BUDGET_EXCEEDED` |
| Any form limit exceeded | `413` | `FORM_LIMIT_EXCEEDED` |

None of these reach the handler — handlers never see half-parsed bodies.

## Value semantics

- **Repeated part names collapse last-wins by default**; `form({ repeated: "preserve" })` additionally exposes every part per name under `groups` (above). The native `request.formData()` remains available in handlers as the raw escape hatch.
- **Files are native `File`** — `stream()` forwards to storage/another service without re-serializing; `arrayBuffer()` for small files.
- **No disk-spooling config, no streaming part events** (ADR-0030 non-goals): handlers get the complete bounded body; spooling for large caps is platform behavior.

## Where next

- [Body limits](./body-limits.md) — budgets, ceilings, and the `413` boundary.
- [Validation](./validation.md) — Standard Schema slots for the JSON lanes (compose: validate `ctx.body.fields` in the handler, or parse uploads to JSON first).
- [Diagnostics](./diagnostics.md) — `LUGAS_FORM_001` and the failure codes above.
