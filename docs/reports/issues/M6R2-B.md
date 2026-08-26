# M6R2-B Evidence — Benchmark validity: response contracts and failure exits

## Baseline
- Base commit: `191bb7f` (main, M6R2 perf-gate merged)
- Issue: #281
- Bun/TypeScript: 1.4.0 / 7.0.2, linux-x64

## Outcome

Completed. Benchmark evidence can now only come from contract-satisfying responses:

- Both runners assert every warmup AND measured request against an explicit
  expectation (exact status; body marker). A fast 404/500 can no longer be
  counted as throughput — the first violation aborts evidence generation and
  the runner exits nonzero.
- `benchmark-plain.ts` matches the validated runner's nonzero-exit pattern
  (`process.exitCode = 1` on any async failure).
- Both runners are import-safe (`if (import.meta.main)` guard) with a
  `BENCH_DURATION_MS` override enabling fast sub-second smoke runs.
- Real measured runs (contract-active) re-ran green on this machine:
  plain-static lugas 118578 rps / plain-json 87230 rps / validated-post
  lugas 59091 rps (raw-bun static was slow this run — noise is recorded,
  not hidden; the gate evaluates lugas samples only per M6R2-A).

## Files changed
- `scripts/benchmark-plain.ts` — owned: Expectation/assertContract, threaded call sites, abort-on-violation, import guard, duration env.
- `scripts/benchmark-validated.ts` — owned: same contract checks inside workers, abort semantics, import guard, duration env.
- `tests/unit/benchmark-validity.test.ts` — owned (new): 6 tests incl. sabotaged-runner nonzero-exit proof.
- `docs/reports/issues/M6R2-B.md` — this evidence report.

## Acceptance mapping

| Criterion | Evidence/test | Result |
|---|---|---|
| Status/body asserted for warmup + measured requests | assertContract unit tests 1–3; both runners threaded | pass |
| First violation aborts evidence, nonzero exit | sabotage test: modified expectation → exit ≠ 0, message present | pass |
| Plain runner nonzero-exit parity | grep-backed test + code change | pass |
| Healthy runs still complete | short smoke of both runners exits 0 | pass |

## Exact commands and results
```text
bun test tests/unit/benchmark-validity.test.ts   # 6 pass, 0 fail
bunx tsc --noEmit                                 # clean
bun run verify                                    # exit 0
```

## Security considerations
None; benchmark tooling only.

## Known limitations / deferred
Contract markers are substring-based ("ok", "static") — sufficient to detect
wrong-route/failed responses without adding allocation-heavy parsing in the hot loop.

## Working-tree state
Clean at handoff.
