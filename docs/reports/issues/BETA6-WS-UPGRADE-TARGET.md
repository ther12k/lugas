---
type: Issue Evidence Report
title: BETA6-WS-UPGRADE-TARGET — New WebSocket handshakes after a sibling listener stops
status: current
tags:
- review
- beta
- websockets
- lifecycle
---

# BETA6-WS-UPGRADE-TARGET — New WebSocket handshakes after a sibling listener stops

## Baseline and outcome

`BETA6-REVIEW-FIXES` documented a pre-existing multi-listener limitation:
after `serve()` is called twice on one app and the later listener shuts
down, new WebSocket handshakes to the surviving listener fail with a
non-101 response (observed on both `cf27017` and the parent, so it was
left out of the stabilization scope). This report covers fixing it.

Root cause: `performUpgrade` resolved the upgrade target from the hub's
single `serverRef`, which every `serve()` overwrites with its own server.
Compiled routes are app-level and shared by all listeners, so once the
most recent listener stopped, handshakes arriving at an earlier listener
called the stopped server's `upgrade()` and answered `426`.

Bun passes the receiving server to native route handlers as their second
argument (verified empirically on the pinned Bun 1.4.x with a
`/probe` route), and the compiled websocket handler boundary is the one
place that sees it per request. Fix: the boundary records the receiving
server in a request-keyed `WeakMap`; `performUpgrade` prefers it and
keeps `serverRef` as the fallback for unrecorded requests. Each listener
now performs its own upgrades, which also keeps socket ownership on the
connection's own server for the per-listener close scoping shipped in
this branch.

## Files and acceptance

- Owned: `src/internal/websocket-hub.ts` (receiving-server record and
  lookup, `serverRef` demoted to fallback), `src/internal/prepared-app.ts`
  (compiled websocket route boundary records Bun's server argument), this
  report.
- Adjacent: `tests/lifecycle/lifecycle.test.ts` (regression test "new
  handshakes keep working on an earlier listener after a later one
  stops"), `docs/websockets.md`, `CHANGELOG.md`. No protected file,
  dependency, or release artifact changed.

## Verification

- Red/green: with only the source fix stashed, the new regression test
  fails against the unfixed hub (handshake rejected); restored, it passes
  — the test pins the defect, not just the new behavior.
- `bun test tests/lifecycle tests/websockets`: 24 passed, 0 failed,
  including both multi-listener tests (close scoping and upgrade target).
- Full `bun run verify` in a clean clone of `002dca0` with the starter set
  up and built and strict flags
  (`LUGAS_REQUIRE_BROWSER=1 LUGAS_REQUIRE_STARTER=1`): exit 0 — 992
  passed, 6 skipped, 0 failed across 998 tests; build, typecheck, docs,
  agent-docs, and diff all PASS. The 6 skips are the same pre-existing
  platform-conditional suite entries as the previous rounds. The
  development perf-gate skip (no benchmark archive) is expected.

## Boundaries and working tree

This closes the last documented limitation of the beta.6 stabilization
candidate; no new boundaries found. `hub.serverRef` remains for the
no-record fallback (e.g. `server === undefined` at the boundary), and the
`503` guard for a server-less upgrade is unchanged. No release-mode
benchmarks, attestation, publication, or push.
