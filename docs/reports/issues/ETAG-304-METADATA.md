---
type: Issue Evidence Report
title: ETAG-304-METADATA — Preserve conditional response cache metadata
status: current
tags:
- etag
- compression
- caching
---

# ETAG-304-METADATA — Preserve conditional response cache metadata

## Baseline and outcome

A framework-generated `304` constructed a new response with only `ETag`.
It lost the handler's current cache policy and `Vary`, and the compression
pass intentionally skipped the `304`. The conditional path now copies
`Cache-Control`, `Content-Location`, `Date`, `Expires`, and `Vary` when set.
It reuses compression's eligibility and `Vary` logic on the original
response; it does not encode or copy body headers into the `304`.

## Files and acceptance

- Owned: `src/internal/compression.ts` copies the selected cache metadata
  and applies the same encoding-variation rule on both response paths.
- Adjacent: `src/internal/prepared-app.ts` supplies the existing compiled
  compression policy to the ETag pass. Pipeline order and public APIs are unchanged.
- Adjacent: `tests/compression/compression.test.ts` tests a cache policy
  update against an unchanged validator, bodyless `304` framing, and Vary
  parity with compression off, ineligible media, an existing field, and `*`.
- Adjacent: `docs/compression.md` documents the behavior. No protected
  files or external dependencies changed.

## Verification

- Before the fix, `bun test tests/compression/compression.test.ts -t '304 preserves current cache metadata'`
  failed: expected `max-age=120` on the revalidation response, got `null`.
  The same test passed after the fix.
- `bun test tests/compression/ tests/sse/ tests/lifecycle/`: 62 passed,
  0 failed on Bun 1.4.0.
- `bun run build && bun run typecheck`: passed in the dependency-equipped
  temporary checkout.
- `bun run verify:docs`, `bun run scripts/generate-llms.ts --check`,
  `bun run scripts/generate-agent-docs.ts --check`, and `git diff --check`: passed.

## Boundaries and working tree

The application still owns its cache directives and any explicit ETag.
Only standard cache metadata is forwarded by the generated response; other
headers are not blindly copied. No inputs, trust boundaries, or release
actions were added. This patch leaves the validator algorithm and
first-party feature scope unchanged. The working tree also contains the
previous SPA, SSE, and WebSocket fixes. No commits or pushes were made;
the full release gate was not run.
