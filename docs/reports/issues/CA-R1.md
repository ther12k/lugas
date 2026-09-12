---
type: Issue Evidence Report
title: 'CA-R1 — Repair typecheck regression: LugasAppInstance hid the documented `prepared` member'
status: complete
tags:
- evidence
- types
- regression
---

# CA-R1 Evidence Report

Regression source: CA-1 (PR #403) used `app.prepared.bunRoutes` in its regression test — present at runtime, absent from the `LugasAppInstance` type. `tsc --noEmit` therefore failed on main from #403 onward; the CA-3 "green gate" reading had clipped the typecheck FAIL line from the captured output. Found while typechecking the CA-4 (bindServices) work.

## Baseline

`bun run typecheck` on main `4c2b3a2`: FAIL — `tests/production/production.test.ts(58,24): error TS2339: Property 'prepared' does not exist on type 'LugasAppInstance<…>'`.

## Outcome

One additive type member: `LugasAppInstance` now declares `readonly prepared: AppInternals<TServices>["prepared"]` (same shape `defineApp` already returns at runtime and `serveApp` consumes). ADR-0035 records the application model as `{ manifest, prepared, serve }` — the instance type must not hide a documented member. No runtime change; `defineApp`'s implementation already produced the value.

## Files changed

- `src/core/app.ts` — `LugasAppInstance.prepared` member (+3 lines with rationale comment)

## Acceptance mapping

- typecheck green → `bun run verify` exit 0: typecheck PASS, test PASS (892 tests across 140 files, 6 skips), docs/diff/agent-docs PASS, perf-gate SKIP (no archive, expected).

## Exact commands and results

```
bun run typecheck            # before: FAIL (TS2339 at production.test.ts:58)
bun run verify               # after: exit 0, all steps PASS (perf-gate SKIP as designed)
```

Note: an intermediate verify run showed 4 consumer-type-check failures (`ENOENT node_modules/@types/bun`) caused by an interrupted `bun install --frozen-lockfile -q` in the fresh worktree; after a proper install the suite is fully green. No product code was involved.

## Security considerations

None — type surface only.

## Known limitations / Not exercised

None.

## Deferred work

None.

## Dependency / merge notes

Must land before CA-4 (which typechecks against main's state). No protected files touched.

## Working-tree state

Clean after commit: `src/core/app.ts`, `docs/reports/issues/CA-R1.md`.
