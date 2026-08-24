# M4R1-GATE Evidence — Independent re-review and evidence gate

## Baseline

- Base commit: `6de9fb0` (main, M4R1-005 merged)
- Branch/worktree: `agent/M4R1-GATE-independent-re-review-and-evidence-gate` / `.worktrees/M4R1-GATE`
- Bun/TypeScript: 1.4.0 / 7.0.2
- Operating system: Linux

## Outcome

**GO** — M4R1 corrections verified independently; M4-009 (golden lock) resumed. All 18 must-pass probes green on the integration base via public API + live serve(). Every M4R1 evidence report complete with exact commands/results.

## Files changed

- `docs/reports/gates/M4R1-GATE.md` — gate packet with issue/PR map, clean-checkout reproduction, probe matrix, evidence review, API changes, GO decision.
- `docs/reports/issues/M4R1-GATE.md` — this evidence report.

No production code changed; no shared/protected files touched.

## Acceptance mapping

| Criterion | Evidence/test | Result |
|---|---|---|
| All 18 must-pass probes green on integration base via public API + live serve() | `bun test tests/conformance/` 19 pass / 0 fail | pass |
| Every M4R1 evidence report complete with exact commands/results | Evidence reports M4R1-001 through M4R1-009 on main | pass |
| No weakened tests, no unapproved API expansion, no out-of-scope cleanup across the wave | Gate report review section confirms zero findings | pass |
| Explicit written decision: M4-009 resumed or blocked | **RESUMED** — goldens from M4-009 consistent with corrected generator | done |
| Exact commands and results recorded in `docs/reports/gates/M4R1-GATE.md` | Full reproduction output in gate report | done |

## Commands and results

```text
bun run versions
# bun 1.4.0; tsc Version 7.0.2

bun run typecheck
# pass

bun test
# 482 pass, 1 skip, 0 fail across 82 files

bun run verify:docs
# verify:docs passed: 0 error(s), 0 warning(s)

bun run verify
# PASS typecheck / tests / docs / diff — full green

bun test tests/conformance/
# 19 pass, 0 fail
```

## Security considerations

- Error redaction suites re-run green inside the full verification.
- Guard reserved-key collisions produce 500s without leaking injected values.

## Known limitations

- ADR-0017 remains formally "proposed" pending owner review at this gate.
- macOS/Windows untested in this environment.

## Deferred work

- Owner acceptance of ADR-0017 at or after this gate.
- M5-013 stress cancellation extends the lifecycle suite.

## Dependency and merge notes

- Dependencies M4R1-001…009 all confirmed merged on base (`a80499c`, PR #214 was the final child).
- Conflict group `gate`; no overlapping worktrees active.

## Working-tree state

Clean at handoff; closes #204.
