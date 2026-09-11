# Performance Regression Gates

## Three-level threshold model

| Level | Meaning | Action |
|---|---|---|
| **Release-blocking** | Below this = must not ship | Fails CI, blocks merge |
| **Alert** | Below target but above block minimum | Warning, requires investigation |
| **Target** | Expected performance on pinned hardware | No action needed |

## Baseline updates

Baseline thresholds are stored in `benchmarks/baselines/m5-accepted.json`.
Updates require a PR with justification referencing new evidence.

## Measurement conditions

Budgets are **host-relative**: they are calibrated on the baseline host
recorded in the baselines file (CPU model, memory, and Bun version are
pinned there) and are not meaningful on other hardware or under other
conditions.

- **Quiet host required.** Throughput and typecheck-budget evidence must be
  captured on an idle machine — no concurrent builds, tests, soak jobs, or
  other significant load. The typecheck budget is a single-shot measurement
  and is the most load-sensitive number in the gate.
- **Calibration vs check.** `typecheckBudgetMs` is calibrated from ≥5
  standalone `tsc --noEmit` runs, median, on the idle baseline host (v2
  evidence: median 2.19 s, 2026-09-11). The gate's in-`verify` measurement
  is a single-shot *check* against that calibration — it is not itself
  calibration evidence.
- **Loaded-machine failures are environmental.** A gate failure measured
  under load is not evidence about the budget. Re-run on a quiet host; never
  re-baseline from loaded-machine numbers.

Incident record (2026-09-11): with unrelated jobs driving load average to
~37 (12 threads), the gate measured `typecheck` at 3088/3713 ms and
standalone runs at 8–12 s — on the same host and commit range where the
idle-host calibration that same day measured a 2.19 s median. Threshold
unchanged (2500 ms): the budget was not stale, the measurement condition was
violated.

## Running

```bash
bun run scripts/check-performance-budget.ts          # check archived results
bun run scripts/benchmark.ts --smoke                 # quick smoke benchmark
bun run scripts/benchmark-plain.ts                   # full plain-route measurement
```
