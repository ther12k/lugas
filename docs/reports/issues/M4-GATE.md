# M4-GATE Evidence — Verify manifest truth, testing, CLI, examples, and agent documentation

## Baseline

- Base commit: `99b6788` (main, M4-017 merged)
- Branch/worktree: `agent/M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documen` / `.worktrees/M4-GATE`
- Bun/TypeScript: 1.4.0 / 7.0.2
- Operating system: Linux

## Outcome

**GO** — alpha hardening authorized. All 17 M4 issues merged with evidence. Manifest truth verified, testing/CLI exports pass package boundaries, generated docs current, conformance suite green.

## Files changed

- `docs/reports/gates/M4.md` — gate packet.
- `docs/reports/issues/M4-GATE.md` — this evidence report.

## Acceptance mapping

| Criterion | Evidence | Result |
|---|---|---|
| All M4 issues merged with evidence | Issues #70–#86 closed; evidence reports on main | pass |
| Manifest contains no erased type claims | ADR-0017 method representation; validates presence-only | pass |
| Testing/CLI exports pass package boundaries | lugas/testing + lugas/client subpath tests pass | pass |
| Generated docs current and clean-room reviewer can locate canonical API | Goldens/llms/agent-docs all up to date; docs/examples.md links all four examples | pass |
| M5 hardening tasks are dependency-ready | M4-GATE closure unblocks M5-001 through M5-016 | pass |
| Exact commands/results recorded | Gate report + commands below | done |
| Diff contains no unrelated cleanup or public-API expansion | Documentation only | pass |

## Commands and results

```text
bun run verify
# PASS typecheck / tests / docs / diff (507 tests)

bun test tests/conformance/
# 19 pass, 0 fail

bun test tests/cli/
# 13 pass, 0 fail

bun test tests/package/
# 7 pass, 0 fail

bun run scripts/update-goldens.ts
# goldens up to date

bun run scripts/generate-llms.ts --check
# llms.txt is up to date

bun run scripts/generate-agent-docs.ts --check
# agent docs up to date
```

## Security considerations

- Error redaction suites re-run green inside full verification.

## Known limitations

- macOS/Windows untested in this environment.
- `{dir}` entries require real filesystem path (documented platform limitation).

## Dependency and merge notes

- Dependencies M4-001…M4-017 all confirmed closed on GitHub; local verification green on base.
- Conflict group `gate`; no overlapping worktrees active.

## Working-tree state

Clean at handoff; closes #87.
