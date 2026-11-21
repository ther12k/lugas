---
type: Issue Evidence Report
title: WS-SIGNAL — Close WebSockets on signal-driven shutdown
status: current
tags:
- lifecycle
- websockets
---

# WS-SIGNAL — Close WebSockets on signal-driven shutdown

## Baseline and outcome

The signal handler called the lifecycle coordinator directly, but the
WebSocket close ran only in the public server wrapper. Socket closure now
runs in the coordinator's stop-accepting phase, before draining, for both
entry points. The coordinator reserves the same shutdown promise before
calling transport code, so a close callback cannot start a second drain.
The public API and opt-in signal configuration are unchanged.

## Files and acceptance

- Owned: `src/internal/lifecycle.ts` and `src/internal/serve.ts` move
  the existing close-with-reason behavior into the shared shutdown path.
- Adjacent: `tests/lifecycle/lifecycle.test.ts` and `tests/lifecycle/fixtures/signal-child.ts`
  use a real SIGTERM with an open WebSocket. The child never calls public
  shutdown. The parent verifies code `1001`, reason `server shutting down`,
  exactly one service disposal, and exit status 0.
- Adjacent: `docs/websockets.md` makes the explicit and signal paths clear.
  No protected files or dependencies changed.

## Verification

- Before the fix, `bun test tests/lifecycle/lifecycle.test.ts -t 'SIGTERM closes WebSockets'`
  failed on Bun 1.4.0/Linux: no graceful close arrived and the bounded test
  cleanup produced `1006 Connection ended` instead of `1001`.
- After the fix, `bun test tests/lifecycle/ tests/sse/`: 42 passed, 0 failed.
- `bun run build && bun run typecheck && bun test tests/websockets/` in
  the dependency-equipped temporary checkout: passed (12 WebSocket tests).
- `bun run verify:docs` and `git diff --check`: passed.

## Boundaries and working tree

The subprocess test uses POSIX signals and skips on Windows; this run
verified SIGTERM, while SIGINT is wired to the same coordinator callback.
Raw Bun WebSockets are not enrolled in the Lugas-managed hub. This does not
change authentication, expose a new network service, or publish anything.
No full release gate was run. This change is independent of the pending
conditional-response metadata fix. Earlier SPA and SSE work remains in the
working tree alongside this patch. No commits or pushes were made.
