# M6R2 Evidence — Performance gate integrity (framework separation, evidence completeness, budgets)

## Baseline
- Base commit: `dc24b65` (main, M6R1-006 merged)
- Issues: #279 (sample merging), #280 (partial/stale evidence), #282 (budget enforcement)
- Bun/TypeScript: 1.4.0 / 7.0.2, linux-x64

## Outcome

Completed. `scripts/check-performance-budget.ts` now enforces an integrity contract:

- **Framework separation (#279)**: only `framework === "lugas"` samples feed the
  gate median; raw Bun samples are never merged and cannot mask framework
  regressions.
- **Sample validity (#279)**: requires ≥5 lugas samples per scenario; every
  rps/percentile value must be finite and positive.
- **Evidence completeness (#280)**: once any archive exists, a missing
  scenario file or missing samples FAIL in every mode ("inconsistent
  evidence"); total archive absence remains dev-mode SKIP with explicit
  "gate not executed, not passed" wording — exit-code protocol distinguishes
  SKIP from PASS.
- **Release mode (#280)**: `--release` fails closed on ANY missing archive,
  missing scenario, or stale commit (`archive.env.commit !== git HEAD`);
  benchmark-validated.ts now records `commit` so binding is possible; verify.ts
  forwards `--release` when `LUGAS_PERF_RELEASE=1`.
- **Full budget model (#282)**: four-branch RPS classification —
  below-target-but-above-alert prints "meets alert floor but BELOW target",
  never "≥ target"; typecheck budget is MEASURED (`tsc --noEmit` timed against
  `typecheckBudgetMs`; honestly reported UNEXECUTED when the local binary is
  unavailable rather than assumed-passing); client-bundle check is mandatory in
  release mode.

## Files changed
- `scripts/check-performance-budget.ts` — owned: full rewrite of lookup/classification/binding logic.
- `scripts/benchmark-validated.ts` — adjacent: records candidate commit in archive env.
- `scripts/verify.ts` — adjacent: release-mode passthrough via env flag.
- `tests/unit/perf-gate-integrity.test.ts` — owned (new): 6 subprocess-driven tests with synthetic sandboxes.
- `docs/reports/issues/M6R2-A.md` — this evidence report.

## Acceptance mapping

| Criterion | Test | Result |
|---|---|---|
| Fast raw-bun + slow lugas → gate FAILS | test "fast raw-bun cannot mask slow lugas" | pass |
| Healthy lugas-only archives pass | test "healthy lugas-only archives PASS" | pass |
| Partial archive fails in dev mode | test "partial archive FAILs in dev mode" | pass |
| Total absence SKIPs (exit 0, "not passed") | test "total absence SKIPs" | pass |
| Release mode: missing evidence & stale commits fail | test "release mode fails on missing evidence and stale commits" | pass |
| Below-target explicitly reported | test "below-target-but-above-alert reported as missed" (line-scoped) | pass |

## Exact commands and results

```text
bun test tests/unit/perf-gate-integrity.test.ts   # 6 pass, 0 fail
bunx tsc --noEmit                                  # clean
bun run verify                                     # exit 0
```

## Security considerations
None beyond supply-chain honesty: stale-evidence rejection binds release
claims to the exact candidate commit.

## Known limitations / deferred
- Environment comparison currently warns on bun-version mismatch instead of
  failing; strict equality belongs to the M6-009 final run where the baseline
  environment is regenerated on the beta candidate.

## Working-tree state
Clean at handoff.
