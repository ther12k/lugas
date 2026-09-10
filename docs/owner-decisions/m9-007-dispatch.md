---
type: Owner Decision Record
title: 'ODR-0016: M9-007 Dispatch — Compression and ETag'
status: accepted
tags:
- owner-decision
- m9
- compression
- etag
---

# ODR-0016: M9-007 Dispatch — Compression and ETag

## Context

The M9-006 telemetry battery is merged on green `main` (`87f84ec`). Per the
owner-directed sequence (ODR-0010), item (d) continues with compression and
ETag. Platform facts verified on the pinned Bun 1.4 baseline: native
`gzipSync`/`deflateSync` exist; **brotli does not** (a dependency would be
required and is excluded). Applications hand-rolling `Accept-Encoding`
negotiation and `If-None-Match` handling get `Vary` correctness and `304`
body rules wrong per-route; both are response-pipeline truths.
[ADR-0033](../okf/decisions/0033-compression-etag.md) fixes the contract.

## Decision

1. **M9-007 ([#379](https://github.com/ther12k/lugas/issues/379)) is
   dispatched** under ADR-0033: `defineApp({ compression })` — gzip/deflate
   negotiation (q-values, identity fallback, structural SSE/pre-encoded/
   range/minSize/type skips, `Vary: Accept-Encoding`) — and
   `defineApp({ etag })` — strong-by-default SHA-1 content validators over
   uncompressed GET/HEAD responses with RFC 9110 `If-None-Match` matching
   and the 304 short-circuit. Etag evaluates before compression; skipped
   responses are byte-identical. No brotli/zstd, no streaming compression,
   no `Last-Modified`/`Cache-Control` policy invention.
2. **Sequence confirmation:** after M9-007, one planned battery remains —
   the rate-limit *contract* (storage application-owned) — then feature
   development stops per the owner's stop-rule and the project prepares
   for stability (ADR-0031 MCP remains parked pending owner decision).
3. **Protected-file authority (this issue only):** M9-007 may edit
   `src/index.ts` (protected) for the additive config-type export lines,
   plus `src/internal/prepared-app.ts` and `src/core/app.ts` as adjacent
   owned-by-this-issue files (the response pass chain gains the two wraps;
   all changes additive, existing behavior unchanged and covered by the
   full suite). `package.json` and `bun.lock` must remain **untouched**
   (native codecs only); `src/client/index.ts`, `src/testing/index.ts`,
   `tsconfig*.json`, and workflows remain untouched. Diagnostics goldens
   regenerate via `scripts/update-goldens.ts --apply` with the reason
   recorded in the evidence report.

## Effect

- The M9-007 worktree may be created from a green base containing this
  record (`docs/m9-007-governance` merge).
- On completion with full evidence, the roadmap's compression/ETag row
  flips to shipped-on-`main`, and `docs/compression.md` joins the synced
  site pages.
- npm publication, dist-tag moves, and any new release candidate remain
  owner-controlled actions.
