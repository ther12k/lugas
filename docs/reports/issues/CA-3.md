---
type: Issue Evidence Report
title: 'CA-3 — Perf-gate integrity sandbox could not resolve the release-identity module, redning the verify gate'
status: complete
tags:
- evidence
- correctness
- release
- perf-gate
---

# CA-3 Evidence Report

Found while running `bun run verify` for CA-1/CA-2 (2026-09-12): the full gate exited 1 with 10 failures in `tests/unit/perf-gate-integrity.test.ts` — on a pristine main checkout, unrelated to either fix. No issue number existed; this report is the issue record.

## Baseline

Branch base: `7e92397` (origin/main after PR #403 and PR #404 merged).

Pre-existing state: since commit `522c363` (PR #402, "single-source the beta.5 candidate version"), `scripts/check-performance-budget.ts` imports `CANDIDATE_VERSION` from `./release/candidate-version`. The integrity test's `buildSandbox()` copies only `check-performance-budget.ts` (with a `ROOT` rewrite), the baselines file, and empty result dirs into a temp sandbox — so every spawned checker run died on module resolution:

```
error: Cannot find module './release/candidate-version' from
  '/tmp/lugas-perfgate-*/scripts/check-performance-budget.ts'
```

All 10 integrity tests failed at baseline (`0 pass / 10 fail / 16 expect() calls` on pristine `f0db64a`), making `bun run verify` red on main and the M6R2 integrity contract unexercised.

## Outcome

Test-infrastructure fix only, no product change: `buildSandbox()` now mirrors `scripts/release/candidate-version.ts` into the sandbox (new `scripts/release` dir + verbatim copy, with a comment recording why). No assertion was weakened or removed — the opposite: the sandbox fix restores the intended semantics, so the M6R2 integrity checks (framework-only gating, fail-closed archives, release-mode commit/platform binding) actually execute again. `candidate-version.ts` is dependency-free, so a verbatim copy is sufficient.

## Files changed

Owned (CA-3):

- `tests/unit/perf-gate-integrity.test.ts` — sandbox mirrors `scripts/release/candidate-version.ts`

Adjacent: none outside the owned set.

## Assumptions

- Copying the file verbatim (rather than inlining the constant or stubbing the module) preserves the release-mode binding behavior under test — the checker must resolve the real identity source exactly as it does in the repo.
- Future imports added to the checker will need the same mirroring; the comment at the copy site names the constraint so the next addition is not a surprise.

## Acceptance mapping

- Integrity suite executes again → `bun test tests/unit/perf-gate-integrity.test.ts`: 10 pass / 0 fail (baseline: 0 pass / 10 fail); expect-call count rises 16 → 31, showing the checks run past module load.
- Full gate green → `bun run verify`: 886 pass / 0 fail, docs PASS, diff PASS, agent-docs PASS.

## Exact commands and results

```
bun test tests/unit/perf-gate-integrity.test.ts
  → 10 pass, 0 fail (baseline at f0db64a: 0 pass, 10 fail)

bun run verify
  → typecheck PASS; tests 886 pass / 0 fail / 6 skip; docs PASS; diff PASS;
    llms/agent-docs PASS; perf-gate SKIP (no benchmark archive — expected
    outside a release rehearsal)
```

## Security considerations

None — test fixture only. The fix strengthens the release integrity gate (fail-closed archive and commit-binding checks were silently unexecutable since `522c363`).

## Known limitations / Not exercised

- The sandbox mirrors exactly the modules the checker imports today; a module graph change in `scripts/` can re-break resolution. The comment at the copy site mitigates, but a repo-relative mirror of the whole `scripts/` tree would be more durable (deferred; larger behavioral change than warranted here).

## Deferred work

- None beyond the durability note above.

## Dependency / merge notes

- Independent of CA-1/CA-2 (both already merged); branched from origin/main `7e92397`. No protected files touched.

## Working-tree state

Clean after commit: `tests/unit/perf-gate-integrity.test.ts`, `docs/reports/issues/CA-3.md`.
