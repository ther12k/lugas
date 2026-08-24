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

## Running

```bash
bun run scripts/check-performance-budget.ts          # check archived results
bun run scripts/benchmark.ts --smoke                 # quick smoke benchmark
bun run scripts/benchmark-plain.ts                   # full plain-route measurement
```
