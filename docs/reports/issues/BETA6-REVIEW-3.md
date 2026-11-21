---
type: Issue Evidence Report
title: BETA6-REVIEW-3 — Third review round and the policy-wrap upgrade defect
status: current
tags:
- review
- beta
- websockets
- compression
---

# BETA6-REVIEW-3 — Third review round and the policy-wrap upgrade defect

## Baseline and outcome

A third review pass covered the two commits the second round had not seen
independently (`7cafdf9`, `002dca0`). Findings and disposition:

1. **P1 — the upgrade fix stopped working behind any response policy.**
   `002dca0` records Bun's receiving-server argument at the compiled
   websocket route boundary, but four app-level passes re-wrap compiled
   handlers OUTSIDE that boundary — `corsWrapHandler`, the secure-headers
   `wrapHeaders`, `wrapLogHandler`, and `wrapTelemetryHandler` — and every
   one forwarded only `(request)`, dropping the server argument. With any
   of CORS, secure headers, logging, or telemetry configured, the record
   never happened, `performUpgrade` silently fell back to the hub's stale
   `serverRef`, and the defect `002dca0` fixed returned for multi-listener
   apps. The `002dca0` regression test configured none of these policies,
   so it passed while the bug persisted behind them. Fix: all four wraps
   now forward the optional server argument, mirroring the existing
   two-arg convention of the serve-time fallback wrappers
   (`corsWrapFallback`, `wrapTelemetryFallback`, `wrapLogFallback`).
   As a side benefit, native route handlers wrapped by logging/telemetry
   now receive the server argument Bun's contract promises instead of a
   dropped second parameter.
2. **P3 — the stale fallback target amplified the failure.** The hub's
   `serverRef` was never cleared when its server shut down, so an
   unrecorded handshake upgraded through a dead server. `serveApp` now
   clears the slot on shutdown, but only when the stopping server owns it.
3. **P3 — `426` conflated two failure kinds.** Bun's `upgrade()` returns
   one `false` for "not a handshake" and "handshake failed server-side".
   The response now decides by the request's own headers: no handshake
   headers stays the honest `426`; a well-formed RFC 6455 handshake that
   cannot complete (listener stopping mid-flight) answers `503`.
4. **P3 (pre-existing, out of `7cafdf9`'s diff) — validators over ranged
   responses.** The etag pass hashed a `206` (or any `2xx` with
   `Content-Range`) into a "strong" validator describing one slice; a
   replay answered `304` for a partial body. The pass now skips
   `Content-Range` responses, symmetric with compression's existing skip.
5. **P3 (docs) — application-validator conditional ownership was
   unstated.** `docs/compression.md` now says the app that owns the
   `ETag` owns the whole conditional contract: Lugas never evaluates an
   application validator against `If-None-Match`, and replays receive the
   full `200` (RFC-permitted).
6. The compression/cdp reviewer confirmed `7cafdf9` clean; its cdp.ts
   comment-precision nit (PATH vs cwd-resolved relative overrides) was
   applied.

## Files and acceptance

- Owned: `src/internal/cors.ts`, `src/internal/logging.ts`,
  `src/internal/telemetry.ts` (two-arg forwarding),
  `src/internal/prepared-app.ts` (secure-headers wrap forwarding),
  `src/internal/serve.ts` (fallback-slot clearing),
  `src/internal/websocket-hub.ts` (426/503 distinction),
  `src/internal/compression.ts` (Content-Range skip), this report.
- Adjacent: `tests/lifecycle/lifecycle.test.ts` (policy-wrapped
  two-listener handshake), `tests/websockets/websockets.test.ts`
  (`performUpgrade` semantics), `tests/compression/compression.test.ts`
  (ranged-response skip), `tests/browser/cdp.ts` (comment),
  `docs/websockets.md`, `docs/compression.md`, `CHANGELOG.md`,
  `docs/roadmap.md`. No protected file, dependency, or release artifact
  changed.

## Verification

- Red/green: with the forwarding changes stashed, the policy-wrapped
  two-listener test fails (handshake to the surviving listener rejected);
  restored, it passes. With the Content-Range skip stashed, the ranged
  test fails (`304` over a slice); restored, it passes.
- `bun test tests/lifecycle tests/websockets tests/compression tests/sse`:
  85 passed, 0 failed.
- Full `bun run verify` in a clean clone of the revised branch with the
  starter set up and built and strict flags
  (`LUGAS_REQUIRE_BROWSER=1 LUGAS_REQUIRE_STARTER=1`): exit 0 — 995
  passed, 6 skipped, 0 failed across 1001 tests (the same six
  platform-conditional skips as every prior round; the perf gate skips in
  development mode without a benchmark archive). The declaration-emission
  build in that clone caught one type-annotation error in the
  `wrapHeaders` widening (`applySecureHeaders` is
  `Response | Promise<Response>`); fixed in the next commit.
- Package rehearsal re-run at the final candidate commit so the tarball
  binds to it: 34/34 checks, `package-rehearsal.json` records
  `packageSourceCommit` = `834c2c1`; publication still dry-run only.

## Fourth review pass (round 4)

The round-3 commits (`600a9ea`, `834c2c1`) received an independent pass:
no blockers, no should-fix defects; the forwarding chain, upgrade-boundary
coverage, shutdown-slot ordering, and validator ordering all verified
clean. Two P3 polish items on the websocket failure path were applied:

1. `isWebSocketHandshake` validated a 24-char key by length, which
   misclassifies in both directions (24 chars can decode to 17/18 bytes;
   the unpadded 22-char encoding of a genuine 16-byte key was rejected).
   It now implements RFC 6455 §4.2.1 directly: GET, `Upgrade: websocket`,
   version `13`, and a `Sec-WebSocket-Key` that base64-decodes to exactly
   16 bytes (padding-normalized).
2. The `426` response carried no `Upgrade` header, which RFC 9110 §10.2.1
   requires. `problem()`'s init argument now supplies `Upgrade: websocket`.

The pass also recorded one pre-existing observation outside its scope:
OpenAPI doc/ui endpoints do not receive the secure-headers policy while
health and SPA handlers apply it manually — flagged for an ADR-0029
intent check as a follow-up, deliberately untouched here.

## Local compatibility cell

The six-cell OS/Bun matrix is CI-only, but the `ubuntu-latest` / Bun
`1.4.0` cell was replicated locally on Bun 1.4.0, following the
compatibility workflow's step list exactly: `bun run build`,
`verify:compatibility-report` PASS, `bun run typecheck` exit 0,
`bun test tests/unit/ tests/conformance/ tests/static/` 400 pass / 5 skip
/ 0 fail, `bun test tests/cli/` 17 pass / 0 fail, and
`bun test tests/security/` 0 fail. The other five cells remain CI work;
this is supplementary evidence, not a matrix attestation.

## Boundaries and working tree

The pre-existing single-`serverRef` limitation is closed by this round;
the fallback slot remains only for requests whose receiving server was
not recorded. The quiet-host release performance gate and the six-cell
compatibility matrix remain owner/infrastructure work. No publication,
attestation, or push.
