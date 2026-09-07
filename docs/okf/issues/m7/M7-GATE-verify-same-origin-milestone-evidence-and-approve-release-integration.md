---
type: GitHub Issue
title: M7-GATE — Verify same-origin milestone evidence and approve release integration
status: draft
tags:
- github-issue
- m7
- release
- gate
generated:
  by: zcode/glm
  at: '2026-09-07T00:00:00+07:00'
issue:
  id: M7-GATE
  milestone: M7
  milestone_title: M7 — ColorJoy Same-Origin Application Delivery
  status: backlog
  priority: P0
  size: M
  area: release
  kind: gate
  global_wave: 49
  milestone_wave: 3
  depends_on:
  - M7-001
  - M7-002
  - M7-003
  - M7-004
  - M7-005
  blocks: []
  conflict_group: gate
  owner_decision: true
  recommended_branch: agent/M7-GATE-verify-same-origin-evidence
  recommended_worktree: .worktrees/M7-GATE
  labels:
  - type:release
  - area:release
  - priority:p0
  - size:m
---

# M7-GATE — Verify same-origin milestone evidence and approve release integration

## Outcome

An owner-reviewed gate verdict on M7: evidence completeness, acceptance anchors demonstrated, and a release-integration decision for the next beta candidate.

## Why this task exists

Milestone gates are the owner's accept/reject point. The already-attested `v0.1.0-beta.1` candidate and its evidence remain unchanged; whatever this milestone ships enters through its own release evidence.

## Source documents

- [ADR-0016 — Evidence-Gated Claims](../../decisions/0016-evidence-gated-claims.md)
- Owner decision: `docs/owner-decisions/colorjoy-adr-approvals.md` (ODR-0003)
- Milestone issues: [M7-001](M7-001-add-opt-in-native-asset-routes-with-explicit-api-ownership-and-safe-misses.md), [M7-002](M7-002-pin-delegated-body-limit-behavior-and-document-transport-level-rejection.md), [M7-003](M7-003-add-application-default-and-route-specific-body-budgets.md), [M7-004](M7-004-add-application-service-lifecycle-with-drain-ordered-shutdown.md), [M7-005](M7-005-ship-browser-ready-client-javascript.md)

## Dependency contract

- **Depends on:** M7-001, M7-002, M7-003, M7-004, M7-005
- **Blocks:** none (release integration is decided here)
- **Global wave:** 49 · **Milestone wave:** 3 · **Conflict group:** `gate`
- **Agent-ready when:** all five issues are merged with complete evidence and the integrated no-build acceptance fixture has run.

M7-001 and M7-002 are satisfied dependencies, not removed dependencies: M7-001 landed in merged PR [#335](https://github.com/ther12k/lugas/pull/335), and M7-002 landed in merged PR [#334](https://github.com/ther12k/lugas/pull/334). M7-003, M7-004, and M7-005 remain declared incomplete dependencies with their existing owner and dispatch gates.

## In scope

- Review every `docs/reports/issues/M7-00*.md` against its acceptance checklist; mark unexecuted checks explicitly.
- Verify the ADR acceptance anchors: asset ownership table (assembled-routing demonstration), body-limit hardening pins, budget-policy guarantee split, lifecycle invariant sequence, two-stage browser evidence with the temp-dir consumer install.
- Confirm ODR-0003 boundaries held (no budget API through M7-002; no SPA fallback in M7-001; export change limited to the approved artifact; lifecycle outcomes reported distinctly).
- Decide release integration: target candidate, changelog, compatibility-statement updates, and re-attestation scope.

## Non-goals

- Re-litigating accepted ADRs.
- New feature work; publication itself remains a separate owner action per the release checklist.

## Acceptance checklist

- [ ] Every M7 issue evidence report complete with exact commands/results.
- [ ] All acceptance anchors demonstrated or explicitly marked unexecuted with reasons.
- [ ] ODR-0003 boundary audit recorded.
- [ ] Release-integration decision recorded (target candidate + evidence scope) or the gate rejected with correction issues.
- [ ] `docs/reports/issues/M7-GATE.md` written; worktree clean.

## Verification commands

```bash
bun run verify
bun run verify:docs
```

## Evidence required

`docs/reports/issues/M7-GATE.md`: gate verdict, acceptance mapping, boundary audit, release-integration decision.

## Agent stop point

Record the verdict and stop. Publication is a separate owner-controlled action.
