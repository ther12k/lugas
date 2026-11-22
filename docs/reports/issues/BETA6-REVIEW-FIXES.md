---
type: Issue Evidence Report
title: BETA6-REVIEW-FIXES — Post-review revision of the beta.6 candidate
status: current
tags:
- review
- beta
- lifecycle
- compression
---

# BETA6-REVIEW-FIXES — Post-review revision of the beta.6 candidate

## Baseline and outcome

A scoped review of `cf27017` (diffed against `134f163`, then verified by
isolated loopback reproduction) confirmed the four original fixes on their
main paths and found two regressions introduced by them, plus two adjacent
pre-existing defects reproduced on both commits:

1. Two `serve()` calls on one app share the hub's socket set, so the new
   signal path closed an opted-out sibling's sockets (observed: second
   listener's client received `1001 server shutting down` on `cf27017`;
   on the parent it kept echoing).
2. The SSE no-buffering skip also skipped `If-None-Match: *`, which used
   to answer `304` for a finite event stream (observed: `200` + event on
   `cf27017`, `304` on the parent).
3. Pre-existing: replaying a framework-generated weak validator never
   matched (the comparison kept the `W/` prefix on one side only).
4. Pre-existing: `If-None-Match: *` turned a `404` into `304`.

Revision: shutdown close is scoped to the stopping server's own socket
view; wildcard conditionals are answered from response status without
hashing (restoring `304` for event streams and gating `*` to successful
responses); `If-None-Match` comparison is weak per RFC 9110 §8.8.3.2
(opaque tags on both sides). Browser-executable discovery now skips
missing candidates instead of throwing at import time.

## Files and acceptance

- Owned: `src/internal/websocket-hub.ts` (per-server socket view),
  `src/internal/serve.ts` (scoped `onStopAccepting`), and
  `src/internal/compression.ts` (wildcard-before-buffering, weak
  comparison, shared `notModifiedResponse`).
- Adjacent: `tests/compression/compression.test.ts` (SSE wildcard 304 with
  exactly-once cleanup; wildcard-on-404; weak replay; the earlier SSE
  regression test now uses a non-matching token so it still proves
  streaming), `tests/lifecycle/lifecycle.test.ts` (two-listener scoping),
  `tests/browser/cdp.ts` (ENOENT-tolerant candidate probing),
  `docs/compression.md`, `docs/websockets.md`, `CHANGELOG.md`, and this
  report. No protected file, dependency, or release artifact changed.

## Verification

- Isolated loopback reproduction (bubblewrap, Bun 1.4.0, no network)
  confirmed items 1–4 on `cf27017` and its parent before fixing.
- `bun test tests/compression tests/sse tests/lifecycle tests/websockets`:
  78 passed, 0 failed — including the four new regression tests.
- Starter suite with NO browser executable present: 3 pass, 12 skip,
  0 fail (previously crashed at import with ENOENT).
- Full `bun run verify` (strict starter/browser flags) in a clean clone of
  the revised branch: exit 0 — 988 passed, 6 skipped, 0 failed across 994
  tests; build, typecheck, docs, agent-docs, and diff all PASS. The
  development perf-gate skip (no benchmark archive) is expected.

## Boundaries and working tree

Known remaining multi-server limitation (pre-existing, not addressed): the
hub keeps one upgrade `serverRef`, so new WebSocket upgrades route to the
most recent listener; established sockets are unaffected. The CI lane for
the starter browser regression touches protected workflow files and is
left as an owner decision. No release-mode benchmarks, attestation,
publication, or push.
