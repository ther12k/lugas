---
type: Architecture Decision Record
title: 'ADR-0033 — Compression and ETag on Native Codecs and Content Validators'
status: accepted
tags:
- adr
- architecture
- compression
- etag
- caching
- '0033'
generated:
  by: zcode/glm
  at: '2026-09-10T00:00:00+07:00'
---

# ADR-0033 — Compression and ETag on Native Codecs and Content Validators

## Status

Accepted by owner decision (ODR-0016, `docs/owner-decisions/m9-007-dispatch.md`, 2026-09-10), dispatching issue [#379](https://github.com/ther12k/lugas/issues/379) (M9-007). Third item of (d), the final planned battery group of the ODR-0010 sequence.

## Context

Compression and conditional requests are the two HTTP response optimizations every production API eventually needs, and both are easy to get subtly wrong per-handler: `Accept-Encoding` negotiation with q-values, `Vary` correctness (a missing `Vary: Accept-Encoding` poisons shared caches with mismatched encodings), validator semantics (`If-None-Match` lists, `*`), and the `304`-carries-no-body rule. Hand-rolled middleware re-decides all of it per route.

The platform facts that shape the design (verified on the pinned Bun 1.4 baseline): `Bun.gzipSync`/`deflateSync`/`gunzipSync`/`inflateSync` exist natively; **brotli does not** — supporting it would mean a dependency (zlib was already a dependency the framework refuses). And `Bun.CryptoHasher("sha1")` gives a fast synchronous content hash for validators.

Two framework truths constrain the mechanics: SSE responses (`text/event-stream`) must never be buffered, so compression must skip them structurally; and the response helpers own their media types, so the policy transforms bodies without rewriting application semantics. The `secureHeaders` pass (ADR-0029) established the pattern — an app-level wrap over pipeline responses — and this battery extends it with body-transforming wraps.

## Decision

Two independent, opt-in `defineApp()` config keys sharing one internal module:

1. **`compression: true | { encodings?, minSize?, types? }`** — Accept-Encoding negotiation over pipeline responses:
   - Supported encodings are **gzip and deflate only** (native codecs; `encodings` filters/subsets them). No brotli/zstd — dependency rule.
   - Defaults: both encodings, `minSize: 1024` bytes, the standard compressible set (`text/*`, `application/json`, `application/*+json`, `application/javascript`, `application/xml`, `image/svg+xml`); exact literal types match `types` overrides.
   - Negotiation: highest-preference client-accepted encoding wins (q-values respected; `q=0` excludes); no usable encoding → identity, untouched.
   - **Skip rules (fail-open to identity):** bodyless statuses (204/304), an existing `Content-Encoding` (never double-encode), `text/event-stream` (SSE buffering is forbidden), `Content-Range` present (range semantics own the body), non-matching content type, body below `minSize`.
   - **`Vary: Accept-Encoding`** is added to every compressible-type response while the policy is enabled — compressed or not — because the response variant depends on the request header either way.
2. **`etag: true | { weak?: boolean }`** — content validators and the `304` short-circuit:
   - Strong by default: SHA-1 over the **uncompressed** body bytes (`"hex…"` quoted; `W/"…"` when `weak: true`) — encoding-independent, so the validator survives compression and proxy re-encoding.
   - **GET/HEAD only** (`If-None-Match` semantics); other methods carry no framework etag.
   - `If-None-Match` matching per RFC 9110: comma lists, quoted-token comparison, `*` matches any current representation → **304** with the same `ETag`, no body.
3. **Order:** the etag wrap evaluates before compression — a `304` short-circuits without paying the encode cost, and the validator hash is computed on canonical bytes before any `Content-Encoding` is applied.
4. **Placement:** both wraps join the response pass sequence in `prepareApp` (innermost → outermost): handler → error policy → gate → **etag → compression** → logging → telemetry → secure headers → CORS. Skipped responses pass through byte-identical.
5. **Fail-closed config:** invalid forms (unknown encodings, non-positive `minSize`, non-string types, non-boolean `weak`) throw `LUGAS_COMPRESSION_001` / `LUGAS_ETAG_001` at `defineApp()`.
6. **Non-goals:** brotli/zstd (dependency), streaming/batched compression (SSE), `Last-Modified`/`Cache-Control` directives (cache policy is the application's), per-route compression overrides, request-body decompression (the body budget owns inbound bytes).
7. **Packaging:** additive root config types; one new internal module; no dependencies; `package.json`/`bun.lock` untouched.
8. **Diagnostics:** `LUGAS_COMPRESSION_001`, `LUGAS_ETAG_001` — catalogued; goldens regenerated with the reason recorded.

## Consequences

- Positive: two declarations make an API bandwidth- and round-trip-efficient with correct `Vary`/validator semantics — the parts applications typically get wrong.
- Positive: zero new dependencies; everything runs on verified-native codecs.
- Cost/tradeoff: gzip/deflate only — clients that would prefer brotli get gzip; documented, revisit trigger below.
- Cost/tradeoff: compression buffers response bodies synchronously within the compressible-type/minSize rules — bounded by what the handler already produced; SSE and streams are structurally excluded.
- Cost/tradeoff: ETag hashes every GET/HEAD response body when enabled — CPU for bytes; applications with immutable payloads can set their own validators, which pass through untouched (fill-if-absent spirit).
- Compatibility effect: two additive config keys + two diagnostics; the response pass chain gains two wraps in a fixed position; skipped responses are byte-identical.

## Alternatives considered

- **Brotli via a dependency (e.g. `brotli-wasm`):** rejected — the zero-dependency rule is a hard constraint; gzip covers the negotiation space honestly.
- **Streaming compression (`CompressionStream`-style chunked encoding):** rejected for this battery — SSE exclusion is structural, and buffered-in-memory JSON bodies (the Lugas response norm) gain nothing from chunked transforms; a streaming variant can amend later with evidence.
- **Per-route `route({ compression })` overrides:** rejected — one app-level policy keeps `Vary` and negotiation coherent; route-level divergence invites cache-variant bugs.
- **`Last-Modified` + `If-Modified-Since` support:** rejected — date validators are strictly weaker than content validators, and clock semantics invite subtle bugs; applications set their own when needed (headers pass through).
- **Weak etags by default:** rejected — strong validators enable range requests and proxy revalidation correctly; weak is opt-in for apps that mutate representations in place.

## Evidence

Implementation issue [#379](https://github.com/ther12k/lugas/issues/379) (M9-007) delivers behavior tests (negotiation round-trips, q-values, every skip rule, `Vary`, validator stability across encodings, 304 semantics incl. `*` and lists, method restriction, secureHeaders composition, diagnostics), `docs/compression.md`, and `examples/compression/`; evidence report `docs/reports/issues/M9-007.md`.

## Revisit trigger

If Bun ships native brotli (or zstd) on all supported platforms, extend `encodings` by amendment with a capability probe — config written today keeps working. If streaming-response compression demonstrates real demand (large non-JSON bodies through the pipeline), a chunked variant needs its own ADR honoring the SSE exclusion.
