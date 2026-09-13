---
type: Owner Decision Record
title: 'ODR-0020: beta.5 Publication with Deferred Performance Gate'
status: accepted
tags:
- owner-decision
- release
- performance
- deferral
---

# ODR-0020: beta.5 Publication with Deferred Performance Gate

## Context

The `0.1.0-beta.5` candidate (CA-17 pre-transpiled distribution) is otherwise
ready: packaging rehearsal proven (27/27 checks), the six-cell compatibility
matrix green at `7e39bbe`, and zero open P0/P1 issues. The release-mode
performance gate, however, cannot be validly executed: the pinned baseline
host (13th Gen Intel i5-13420H, `benchmarks/baselines/m5-accepted.json`) is
occupied until approximately 2026-09-16 11:18 WIB by an unrelated soak
campaign in the sibling `velqu` workspace (72 h, driving load average ~13).
Per `docs/performance-gates.md`, measurements captured under load are
environmental, never evidence, and the typecheck budget is the most
load-sensitive number in the gate.

The owner reviewed the alternatives (waiting for the soak; re-homing the
measurements to an external server, which would require re-baselining the
thresholds to different hardware) and chose an explicit, recorded deferral.

## Decision

1. **Waiver granted for this candidate only.** The beta.5 release packet is
   assembled with the release-mode performance gate DEFERRED. The release
   evidence records `perfGate: "deferred"` with a null measurement set and
   this record as `deferralRef`; the generated checklist and release packet
   state the deferral explicitly. Every other gate runs unchanged:
   build, typecheck (pass/fail), full test suite, docs, diff, the
   package rehearsal with dry-run publication, the two-identity attestation,
   the compatibility matrix owner-check, and the P0/P1 owner-check.
2. **Owner instruction (2026-09-13).** Asked whether a shorter verification
   could ship beta.5 with the full benchmark afterwards, the owner directed:
   "just doit we can release beta 6 after that."
3. **Risk acknowledged.** npm versions are immutable. If the deferred gate
   later finds a regression, `0.1.0-beta.5` is never republished — a
   successor version supersedes it. The owner accepted this explicitly.
   Mitigating context: every performance-relevant change since beta.4
   measured positive or neutral (pre-transpiled distribution ~12 ms faster
   unbundled startup; lifecycle gate fast path +3.2% CPU efficiency;
   conditional WebSocket hub lowering retained memory).
4. **Commitment (binding, not aspirational).** The full performance gate plus
   a fresh ≥5-run typecheck calibration run on the quiet baseline host after
   the soak campaign ends, only after the documented quiet-host conditions
   are re-verified (campaign completion alone is not proof of idleness).
   Calibration samples and the gate result are recorded as separate
   artifacts. The 2,500 ms budget is unchanged.
5. **Publication remains owner-executed.** The packet builder assembles and
   attests; the publish sequence (preflight, tag, `npm publish --tag beta`,
   GitHub release) is run by the owner from an authenticated session, per
   the checklist.

## Effect

- `scripts/check-performance-budget.ts` gains `--defer-perf` (release mode
  only, requires `LUGAS_PERF_DEFERRAL_REF`); `scripts/perf-gate-plan.ts` and
  `scripts/verify.ts` thread the deferral; `scripts/release/build-beta-packet.ts`
  validates the deferred evidence shape and renders the deferral in the
  generated packet. The default pipeline is unchanged and remains
  fail-closed: without the explicit flag and reference, release mode still
  fails closed on missing or stale evidence.
- This waiver applies to `0.1.0-beta.5` only. Any later candidate reverts to
  the executed-gate pipeline unless a successor record says otherwise.
