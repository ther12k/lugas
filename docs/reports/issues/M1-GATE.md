# M1-GATE Evidence — Bun-native kernel and response contract

## Outcome

PASS locally. M1-001 through M1-018 have merged evidence and the full local verifier passes. M2 may start after gate merge.

## Baseline

- Base commit: c206180
- Bun/TypeScript: 1.4.0 / 7.0.2
- OS: Linux 7.0.0-28-generic x64

## Acceptance mapping

| Criterion | Evidence | Result |
|---|---|---|
| Every M1 issue merged with evidence | PRs #129–#146 and issue reports | pass |
| Native kernel/response contract verified | 111 tests pass, 1 documented skip, 0 fail | pass |
| Package root declarations smoke-test | M1-018 consumer test and strict typecheck | pass |
| M1 correctness blockers resolved | nested method-map defect corrected in c206180 | pass |

## Commands and results

- bun install --frozen-lockfile — pass
- bun run verify — typecheck pass; 111 pass, 1 skip, 0 fail; docs pass; diff pass
- bunx tsc --noEmit — pass

## Security and limitations

Descriptor errors are redacted by withErrorPolicy. Raw Bun standalone error-page leakage is documented and wrapped. GitHub Actions is blocked by the repository account billing/spending-limit condition; local equivalent verification passes. Linux-only characterization remains.

## Working-tree state

Clean after commit; gate closes #31.
