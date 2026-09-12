---
type: Issue Evidence Report
title: 'CA-2 — SSE heartbeat timer leaked when start() closed the stream synchronously'
status: complete
tags:
- evidence
- correctness
- sse
---

# CA-2 Evidence Report

Found during the post-dogfood roadmap assessment (2026-09-12): a reduced scheduling probe showed that `sse({ start(w) { w.close(); ... }, heartbeatMs })` leaves an outstanding heartbeat timer when `start()` ends its own stream synchronously. No issue number existed; this report is the issue record.

## Baseline

Branch base: `f0db64a` (merge of PR #402, clean main; CA-1 merged independently, no file overlap).

Pre-existing state in `src/core/sse.ts`: after invoking `config.start(writer)`, the helper ran the returned cleanup immediately when `state.closed` (the synchronous-close path), then **unconditionally created the heartbeat interval**. Because `runCleanup()` had already consumed its idempotence guard before the timer existed, the interval was never cleared. Probe at baseline (Bun 1.4.0, Linux x64):

```
--- with heartbeatMs (close during start) ---
cleanup ran / sse() returned, status 200 / 50ms elapsed; event loop still live
exit=124  (process held by the leaked timer; killed by timeout)
--- control: same close-during-start, no heartbeatMs ---
exit=0
```

Existing coverage tested client abort with a producer-owned timer (`tests/sse/sse.test.ts` "cleanup runs exactly once on client abort; heartbeat timer stops with it") but no test exercised close-during-start with `heartbeatMs` enabled — exactly the documented risk ("start() may have ended its own stream synchronously … run it immediately").

## Outcome

One behavioral correction, no API change: heartbeat creation is now guarded on `!state.closed`. If `start()` closed (or a racing cancel ended) the stream before returning, no timer is created — there is nothing for it to do, and cleanup has already run. Creation stays *after* `start()` deliberately: if `start()` throws, the validation error propagates with no timer alive, so reordering creation before `start()` would introduce a throw-path leak to fix a close-path leak.

Regression test added to `tests/sse/sse.test.ts` ("heartbeat timer lifecycle: created for a live stream, never after a synchronous close (CA-2)"): it substitutes `globalThis.setInterval` with a counting wrapper (unref'd, so a regressed leak cannot hang the runner) and pins both sides of the contract — a live stream creates exactly one timer (cleared by `writer.close()`), and a stream closed synchronously during `start()` creates none while cleanup still runs exactly once. Verified to bite: with the fix stashed the test fails (0 pass / 1 fail); with the fix applied, 13/13 pass.

## Files changed

Owned (CA-2):

- `src/core/sse.ts` — heartbeat creation guarded on `!state.closed`, with the constraint recorded in a comment
- `tests/sse/sse.test.ts` — heartbeat lifecycle regression test

Adjacent: none outside the owned set.

## Assumptions

- Skipping creation (rather than making `runCleanup` re-runnable or moving creation earlier) is the minimal honest fix: a closed stream can never emit a heartbeat, and both alternatives add state or move a leak between paths.
- The counting-`setInterval` substitution in the test is faithful: `sse()` resolves `setInterval` from the global at call time.

## Acceptance mapping

- "close during start with heartbeat enabled" regression (assessment recommendation) → the new test's `timersCreated` assertion; verified failing at baseline.
- Deterministic cleanup contract unchanged → `cleanups === 1` asserted in the same test; existing cleanup tests untouched and passing.
- Live-stream heartbeat behavior unchanged → `timersCreated === 1` for a live stream; existing "heartbeat timer stops with it" abort test passing.
- End-to-end leak gone → probe re-run against the fixed source exits 0 (was 124).

## Exact commands and results

```
bun test tests/sse/sse.test.ts
  → 13 pass, 0 fail (was 12 pass before the new test)

git stash push src/core/sse.ts && bun test tests/sse/sse.test.ts -t "CA-2"
  → 0 pass, 1 fail (regression test bites on unfixed source); stash popped

timeout 2 bun run <probe: sse close-during-start with heartbeatMs>
  → exit=0 (baseline: exit=124, process held by leaked timer)

bun run verify
  → typecheck PASS; tests 875 pass / 6 skip / 10 fail; docs PASS; diff PASS;
    llms/agent-docs PASS; perf-gate SKIP (no archive)
```

The 10 failures are all in `tests/unit/perf-gate-integrity.test.ts`, pre-existing at baseline `f0db64a` (identical on pristine main; caused by `522c363` adding a `./release/candidate-version` import the test sandbox does not copy). Unrelated to this fix; tracked separately (CA-3).

## Security considerations

The leak held a timer writing into a closed stream controller per affected response — a resource-exhaustion vector under repeated short-lived SSE connections with heartbeats (each request pinned an interval forever). Fixed by construction; no new surface.

## Known limitations / Not exercised

- The racing-cancel-then-heartbeat variant (cancel arriving between `start()` return and heartbeat creation) is not separately tested: both `close()` and `cancel()` set `state.closed`, so the same guard covers it, but reproducing that interleaving deterministically would require scheduler control the current probe style does not have.

## Deferred work

- Bounded/awaitable SSE producer backpressure remains the separate roadmap item assessed on 2026-09-12; this fix only closes the timer-lifecycle hole in the existing primitive.

## Dependency / merge notes

- Independent of CA-1 (merged) and CA-3; no file overlap. No protected files touched.

## Working-tree state

Clean after commit: `src/core/sse.ts`, `tests/sse/sse.test.ts`, `docs/reports/issues/CA-2.md`.
