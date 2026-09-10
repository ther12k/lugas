---
title: "Compression and ETag"
description: "Native gzip/deflate negotiation and 304 conditional requests."
---
Two opt-in response policies make an API bandwidth- and round-trip-efficient: `compression` negotiates gzip/deflate over pipeline responses using Bun's native codecs, and `etag` computes content validators and answers conditional requests with `304`. Both follow the `secureHeaders` pattern — app-level, declaration-time validated, byte-identical passthrough when a skip rule applies. See [ADR-0033](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0033-compression-etag.md).

## Compression

```ts
import { defineApp } from "lugas";

export default defineApp({
  compression: true,                       // or fine-tune:
  // compression: {
  //   encodings: ["gzip", "deflate"],     // native codecs only (no brotli — dependency)
  //   minSize: 1024,                      // bodies at/below pass through
  //   types: ["application/json", "text/html", "image/svg+xml"],  // +text/*, +application/*+json always
  // },
  routes: { /* … */ },
});
```

Negotiation honors `Accept-Encoding` q-values (highest preference wins; `q=0` excludes); no usable encoding means the response passes through uncompressed.

**Structural skips** — each observable, each fail-open:

| Skip | Why |
|---|---|
| Bodyless statuses (204/304) | Nothing to encode. |
| Existing `Content-Encoding` | Never double-encode. |
| `text/event-stream` | [SSE](/lugas/sse/) must never be buffered. |
| `Content-Range` present | Range semantics own the body. |
| Non-compressible type | Encoding binaries wastes CPU. |
| Body ≤ `minSize` | Tiny bodies grow under compression. |

**`Vary: Accept-Encoding`** is added to every compressible-type response while the policy is enabled — compressed or not — because the response variant depends on the request header either way; omitting it poisons shared caches.

## ETag

```ts
export default defineApp({
  etag: true,            // strong validators (default) — or { weak: true } for W/"…"
  routes: { /* … */ },
});
```

- **Strong by default**: SHA-1 over the **uncompressed** body — encoding-independent, so the same validator matches a gzip-encoded response and a plain one, and survives proxy re-encoding.
- **GET/HEAD only** (`If-None-Match` semantics); POST/PUT/PATCH carry no framework etag.
- **`If-None-Match` per RFC 9110**: quoted tokens, comma lists, and `*` all match → **`304`** with the same `ETag` and no body.
- **Application etags win** (fill-if-absent): a handler that sets its own `ETag` (version numbers, immutable-content hashes) is never overwritten.
- A `304` short-circuits **before** compression — conditional hits never pay the encode cost.

## How they compose

The response passes run innermost → outermost: handler → error policy → gate → **etag** → **compression** → logging → telemetry → [secure headers](/lugas/production/) → [CORS](/lugas/cors/). Both policies are skip-transparent: a response any rule excludes crosses the chain byte-identical. Combined with `secureHeaders`, one response can carry `content-encoding`, a matching `etag`, and the security baseline together.

## Deliberately not here (ADR-0033 non-goals)

- **Brotli/zstd** — no native codec on the pinned Bun baseline; adding a dependency for it is against the zero-dependency rule. Revisit trigger: native support lands.
- **Streaming compression** — SSE is structurally excluded; buffered JSON bodies gain nothing from chunked transforms.
- **`Last-Modified`/`Cache-Control` policy** — cache directives are the application's; set headers in handlers and they pass through.
- **Request-body decompression** — the [body budget](https://github.com/ther12k/lugas/blob/main/docs/body-limits.md) owns inbound bytes.

## Where next

- [Production hardening](/lugas/production/) — the header policy these compose with.
- [SSE](/lugas/sse/) — the streaming responses compression structurally protects.
- [Diagnostics](/lugas/diagnostics/) — `LUGAS_COMPRESSION_001`, `LUGAS_ETAG_001`.
