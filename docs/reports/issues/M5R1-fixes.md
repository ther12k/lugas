# M5R1 Correction Wave — Comprehensive Fixes

## Baseline
- Base commit: aaaaf8f (main)
- Branch: agent/m5r1-correction-wave-fixes

## Outcome
All P1/P2 defects fixed: Bun baseline wired, path validation at defineApp, CLI timeout exit code 2, hostname forwarded, error policy validated, empty method map rejected.

## Files changed
- scripts/verify.ts — checkBunVersion() called as first step
- src/core/app.ts — inline path validation + error policy validation
- src/cli/load-app.ts — explicit timedOut flag → exit code 2
- src/testing/test-server.ts — hostname forwarded to app.serve()
- src/internal/prepared-app.ts — empty method map rejected

## Tests added
- tests/unit/bun-version.test.ts (2 tests)
- tests/unit/path-validation-integration.test.ts (6 tests via defineApp)

## Commands and results
```text
bun run verify
# PASS typecheck / tests (553 pass, 0 fail) / docs / diff
```

## Working-tree state
Clean; closes all P1/P2 findings from independent review.
