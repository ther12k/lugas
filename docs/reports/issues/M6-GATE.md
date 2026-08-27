# M6-GATE Evidence — Approve or reject the v0.1.0-beta.1 release candidate

## Baseline
- Base commit: `3ec5a89` (main, release packet assembled)
- Issue: #116 (M6-GATE)
- Bun/TypeScript: 1.4.0 / 7.0.2, linux-x64

## Outcome

Completed. Full independent gate evaluation and owner release sign-off:

- **Verdict:** **GO** — v0.1.0-beta.1 candidate approved for release.
- **Milestone Audit:** All requirements from M0 through M6 satisfied with zero open P0/P1 defects and zero waivers.
- **Verification Gate:** `bun run verify` clean (620 tests passing, 0 failures, 1 documented baseline skip, typecheck clean, docs validator clean, git diff clean).
- **Performance Invariants:** Release-mode budget gate passed with margins exceeding targets (plain-static 137k rps, plain-json 107k rps, validated-post 66k rps, typecheck 833ms, client bundle 14.9kB).
- **Owner Decisions:** ODR-0001 (`lugas` package name) and ODR-0002 (Apache-2.0, notices, security policy, governance) recorded and approved.
- **Compatibility Matrix:** All 6 cells green on CI (`.github/workflows/compatibility.yml`), guarded by `verify:compatibility-report`.
- **Packaging & Supply Chain:** Zero production runtime dependencies; 69 tarball files; publication dry-run validated (`npm publish --dry-run --access public --tag beta`).
- **Gate Packet:** `docs/reports/gates/M6.md` and `docs/okf/log.md` published.

## Files changed
- `docs/reports/gates/M6.md` — owned: M6 beta gate review packet.
- `docs/okf/log.md` — owned: project log updated through M6 gate completion.
- `docs/reports/issues/M6-GATE.md` — this evidence report.

## Acceptance mapping

| Criterion | Evidence | Result |
|---|---|---|
| Beta packet verified | `docs/releases/beta/RELEASE_PACKET.md` and `CHECKLIST.md` | pass |
| Owner approvals recorded | ODR-0001, ODR-0002, `LICENSE`, `NOTICE`, `SECURITY.md`, `GOVERNANCE.md` | pass |
| Compatibility verified | `docs/compatibility.md`, `docs/reports/m6-compatibility.md` (6/6 green cells) | pass |
| Zero P0/P1 defects | All 22 triage/correction wave findings closed and verified | pass |
| Clean-room agent proof passed | `tests/clean-room/billing-service.test.ts` (8/8 pass) | pass |
| Publication identity confirmed | `lugas@0.1.0-beta.1`, Apache-2.0, `ther12k/lugas` | pass |
| Gate decision recorded | `docs/reports/gates/M6.md` (GO verdict) | pass |
| Full verification green | `bun run verify` exit 0 | pass |

## Exact commands and results
```text
bun run verify                      # exit 0 (620 tests passing, 0 failures)
bun run release:package:rehearse    # 15/15 checks green
bun run verify:compatibility-report # PASS (18 checks)
bun run scripts/check-performance-budget.ts --release # PASS: 0 failures, 0 alerts
```

## Security considerations
Final supply-chain audit confirms zero production runtime dependencies and complete error-redaction invariants.

## Known limitations / deferred
Post-beta roadmap items (OpenAPI adapter, advanced browser clients) subject to future ADRs.

## Working-tree state
Clean at handoff.
