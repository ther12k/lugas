---
type: Owner Decision Record
title: 'ODR-0021: beta.5 Verification Discharge — Quiet-Host Gate Executed'
status: accepted
tags:
- owner-decision
- release
- performance
- beta5
---

# ODR-0021: beta.5 Verification Discharge — Quiet-Host Gate Executed

## Context

[ODR-0020](./beta5-deferred-performance-gate.md) allowed `0.1.0-beta.5` to
publish with `perfGate: "deferred"` and bound the release to a follow-up
commitment (its point 4): the full performance gate plus a fresh ≥5-run
typecheck calibration on the quiet baseline host, only after the documented
quiet-host conditions were re-verified, with calibration samples and the
gate result recorded as separate artifacts and the 2,500 ms budget
unchanged.

Two repository records completed the execution path:

- **CA-21 (PR #433)** executed the verification on 2026-09-15 at the exact
  candidate identity — packageSourceCommit and attestationCommit both
  `6943f88`, tarball `50fd1356…` — after an owner-authorized host re-check
  found the documented conditions met (load 2.96 / 2.71 / 2.97 on 12
  threads, steady across windows; the soak campaign gone). Results:
  plain-static 99,774 rps, plain-json 77,093 rps, validated-POST 38,692 rps
  (targets 60,000 / 50,000 / 25,000); typecheck calibration 7 valid
  samples, median 1,965 ms against the unchanged 2,500 ms budget; the
  single-shot gate returned PASS. Raw samples, medians, and the gate
  result are recorded as the separate artifacts
  `docs/releases/beta/release-evidence-beta5-quiet-host-verification.json`
  and `docs/releases/beta/typecheck-calibration-beta5-quiet-host.json`.
- **PR #434** reconciled the qualification-rule layers the owner required
  to be settled by authoritative repository policy, not conversation
  memory: qualification for release-gate execution is governed by the
  documented policy as operationalized by the M6 gate record (M6R6 runs on
  a quiet host — sustained load < 4, per `docs/reports/gates/M6.md` #309);
  the narrower operational figures in `docs/reports/issues/CA-12.md`
  (1-min < 2.0 AND 15-min < 3.0) remain the heuristic for that report's
  own narrower check. The report's drift claim was narrowed accordingly:
  every result passed with margin under the qualifying conditions; no
  competing workload was identified; the causal contribution of ambient
  drift was not quantified.

## Decision (owner, 2026-09-15)

1. **Qualification-rule endorsement.** The #434 reconciliation is accepted:
   the M6 gate record's sustained-load rule is the governing qualification
   layer for release-gate execution. The CA-21 re-check and session satisfy
   it as recorded.
2. **Discharge.** ODR-0020's binding commitment (its point 4) is
   **fulfilled** by the CA-21 execution. No further verification is owed
   for `0.1.0-beta.5`. ODR-0020 itself remains the publication-time waiver
   record, unchanged; this successor record closes its follow-up
   obligation.
3. **Immutability preserved.** The published
   `docs/releases/beta/release-evidence.json` (`perfGate: "deferred"`,
   null measurements, `deferralRef: ODR-0020`) is not rewritten; the
   deferral never becomes a retroactive PASS. Nothing is republished;
   dist-tags are unchanged (`beta` → `0.1.0-beta.5`, `latest` →
   `0.1.0-beta.4`).

## Boundaries (what this does not decide)

- **No performance acceptance for any successor candidate.** Beta.6's
  changed source requires its own executed gate under its own applicable
  checklist; beta.5's results cannot serve as beta.6 acceptance.
- No threshold, budget, or rule change, and no performance claims beyond
  the recorded measurements.
- The measured results are host-specific and bound to `6943f88`; they do
  not transfer to other hardware, hosts, or source states.

## Effect

The ODR-0020 follow-up workstream is closed. The next step in the release
sequence is the beta.6 packet assembly/publication decision, which requires
explicit owner authorization and beta.6's own applicable release evidence.
