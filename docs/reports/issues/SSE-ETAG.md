---
type: Issue Evidence Report
title: SSE-ETAG — Keep live event streams out of ETag buffering
status: current
tags:
- sse
- etag
- compression
---

# SSE-ETAG — Keep live event streams out of ETag buffering

## Baseline and outcome

The ETag pass runs before compression and reads the whole response body to
compute a validator. A live SSE response never reached the compression pass's
existing SSE exclusion until its writer closed. Both policies now use the
same normalized media type to skip `text/event-stream` before reading any
body bytes. Any application-provided ETag is left untouched.

## Files and acceptance

- Owned: `src/internal/compression.ts` skips event streams in the ETag pass.
- Adjacent: `tests/compression/compression.test.ts` exercises both policies
  over HTTP. It requests gzip and sends `If-None-Match: *`, then reads a
  complete event before closing the writer. The response stays `200` with
  neither a framework-generated ETag nor a content encoding.
- Adjacent: `docs/compression.md` documents the exclusion. No protected
  export, package, or workflow files changed.

## Verification

- Before the fix, `bun test tests/compression/compression.test.ts -t 'SSE sends an event'`
  failed with `TimeoutError` before receiving the HTTP response (1 failure).
- After the fix, `bun test tests/compression/ tests/sse/`: 47 passed, 0 failed
  on Bun 1.4.0.
- `bun run build && bun run typecheck`: passed in the dependency-equipped
  temporary checkout. The first typecheck without `dist/` failed with missing
  package self-reference declarations; building generated them.
- `bun run scripts/generate-llms.ts --check` and
  `bun run scripts/generate-agent-docs.ts --check`: passed.
- `bun run verify:docs` and `git diff --check`: passed.

## Boundaries and working tree

The skip is media-type based, not a general detector for finite and
indefinite Web streams. The change touches only outbound response handling;
there are no new trust boundaries, inputs, or dependencies. The 304 metadata
and signal-driven WebSocket changes are separate. No full release gate was
run. The working tree retains the earlier uncommitted SPA starter patch
alongside these changes; no commits or publication.
