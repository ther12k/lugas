# M3-GATE Evidence — Verify end-to-end client types, runtime behavior, and type cost

## Baseline

- Base commit: `8f07399` (main, M3-018 merged — all 18 M3 dependencies present)
- Branch/worktree: `agent/M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost` / `.worktrees/M3-GATE`
- Bun/TypeScript: 1.4.0 / 7.0.2
- Operating system: Linux

## Outcome

Passed with verdict **GO** (see `docs/reports/gates/M3.md`). All 18 M3 child issues are merged with evidence; every gate verification command was reproduced in this clean worktree; the 500-route type gate is accepted with disclosed reproduction variance; the packed browser client works from a clean consumer; the server/client runtime matrix is green.

## Files changed

- `docs/reports/gates/M3.md` — owned: full gate packet per the review-packet standard (issue/PR map, criterion→evidence mapping, clean-checkout reproduction, semantics review, independence confirmations, unresolved defects, API/ADR changes, compatibility matrix, GO verdict).
- `docs/okf/log.md` — owned: appended "M3 gate passed locally" entry authorizing M4.
- `docs/reports/issues/M3-GATE.md` — this evidence report.

## Assumptions

- Canonical command mappings for unwired package scripts: `test:client` → `bun test tests/client`; `typebench:all` → `bun run scripts/typebench.ts`; `package:dry-run` → `npm pack --dry-run --json`.
- Typebench wall-clock times vary with machine load between runs; instantiation counts are deterministic and were used as the authoritative comparison (identical across gate and original runs).
- The one mid-milestone correction commit (M3-013 documentation restore) is disclosed in the packet rather than treated as a failure.

## Acceptance mapping

| Criterion | Evidence/test | Result |
|---|---|---|
| All M3 issues merged with evidence | #51–#68 closed; 19 PRs (#166–#185 incl. correction); evidence reports on main | pass |
| 500-route type gate accepted and 1,000-route disclosed | Gate report decision + reproduced matrix (500: 339 ms cold this run, instantiations identical at 177,486; 1000: 464 ms / 317,585) | pass |
| Packed browser client works from clean consumer | Reproduced `npm pack --dry-run` = 62 entries; client-export suite 5/5 | pass |
| Server/client runtime matrix is green | `bun test tests/client` 40/40; full suite 367 pass / 1 documented skip / 0 fail | pass |
| M4 can rely on a stable app/client contract | Frozen semantics docs + public barrels + recorded type-cost baseline | pass |
| Exact commands/results recorded | Packet + commands below | done |
| Diff contains no unrelated cleanup or public-API expansion | Documentation-only diff (two owned files + report) | pass |
| `git status --short` clean at handoff | Working-tree state below | pass |

## Commands and results

```text
bun run verify
# PASS typecheck / tests (367 pass, 1 skip, 0 fail) / docs / diff

bun test tests/client                          [test:client]
# 40 pass, 0 fail

bun run scripts/typebench.ts                   [typebench:all]
# 500-route cold 339 ms / 111 MB (instantiations 177,486 — identical to gate report)
# 1,000-route cold 464 ms / 156 MB (instantiations 317,585)

npm pack --dry-run --json                      [package:dry-run]
# 62 entries; no benchmarks/.worktrees/stress data

rg -c "elysia|eden|Bun\\.|new Proxy" src/client/*.ts
# zero real matches (three substring false positives from 'precedence'/'credentials', inspected)
```

## Security considerations

- Independence scans re-run at gate level; client dependency surface remains zero.
- No secrets or payloads enter diagnostics (re-verified via redaction suites inside full run).

## Known limitations

- Wall-clock timing variance under load disclosed; counts authoritative.
- CI remains blocked by GitHub Actions account billing/spending-limit condition (owner-side), so gate verification is local-only by necessity — same disclosure as prior gates.

## Deferred work

- M4-001/005/006/007/013 and M5-005 are now unblocked; M5-014 stress closure builds on the typebench harness.

## Dependency and merge notes

- All 18 dependencies confirmed merged on base; local verification green on base before starting.
- Conflict group `gate`; no overlapping worktrees active. Only owned files touched.

## Working-tree state

Clean at handoff; closes #69.
