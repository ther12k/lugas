---
type: GitHub Issue
title: M7-003 — Add application-default and route-specific body budgets
status: draft
tags:
- github-issue
- m7
- security
- architecture
generated:
  by: zcode/glm
  at: '2026-09-07T00:00:00+07:00'
issue:
  id: M7-003
  milestone: M7
  milestone_title: M7 — ColorJoy Same-Origin Application Delivery
  status: blocked
  priority: P1
  size: L
  area: security
  kind: feature
  global_wave: 48
  milestone_wave: 2
  depends_on:
  - M6-GATE
  - M7-002
  blocks:
  - M7-GATE
  conflict_group: security-hardening
  owner_decision: true
  recommended_branch: agent/M7-003-body-budget-policy
  recommended_worktree: .worktrees/M7-003
  labels:
  - type:feature
  - area:security
  - priority:p1
  - size:l
---

# M7-003 — Add application-default and route-specific body budgets

## Outcome

The ADR-0019 budget policy implemented: a per-route budget and an application default, clamped by the server ceiling, with the framework-parsed vs raw-stream guarantee split made real and tested.

**Dispatch gate:** separately gated per ODR-0003 — requires this issue's dependencies merged **and** the owner's explicit go. The M7-002 hardening issue must not introduce any part of this API.

## Why this task exists

An application with one large-upload endpoint must currently raise the server-wide ceiling or split servers. [ADR-0019](../../decisions/0019-body-budget-policy.md) (accepted as amended) defines the contract.

## Source documents

- [ADR-0019 — Application-Default and Route-Specific Body Budgets](../../decisions/0019-body-budget-policy.md)
- Owner decision: `docs/owner-decisions/colorjoy-adr-approvals.md` (ODR-0003)
- `docs/body-limits.md`

## Dependency contract

- **Depends on:** M6-GATE, M7-002
- **Blocks:** M7-GATE
- **Global wave:** 48 · **Milestone wave:** 2 · **Conflict group:** `security-hardening`
- **Agent-ready when:** M7-002 is merged, the owner gate is recorded, and no other worktree owns the route-declaration types or body-parsing path.

## In scope

- Selection rule: `selectedBudget = routeOverride ?? applicationDefault ?? serverCeiling`; `effectiveBudget = min(serverCeiling, selectedBudget)`; override relaxes the default, never the ceiling.
- Startup rejection of an explicitly configured application or route budget above the server ceiling.
- Compatibility rule preserved: no configuration → existing server-ceiling behavior (regression).
- Framework-parsed bodies: effective budget enforced during bounded consumption, before parsing and handler execution.
- Raw-stream routes: byte-counted enforcement through the budgeted body interface that stops further budgeted reads on overflow (handler may have started; no rollback of earlier side effects; no promised replacement of an already-committed response). Permitted narrower implementation: reject budget configuration on unsupported raw paths. An apparently-active but inert budget is a defect, not a design.
- Dual-threshold evidence: a Lugas-level rejection exercised with a threshold below Bun's threshold.

## Non-goals

- Replacing or wrapping Bun's transport enforcement with a second counting layer for the transport ceiling.
- Changing the transport rejection shape (bare `413` stays the pinned transport behavior).

## Owned files

```text
src/core/route.ts (budget option)
src/core/types.ts
src/internal/parse-json-body.ts / body-consumption path
src/internal/prepared-app.ts (startup validation)
tests/security/body-budgets.test.ts (new)
docs/body-limits.md
docs/api-reference.md
```

## Protected shared files

```text
src/index.ts (public export — integrator)
package.json, bun.lock, tsconfig*.json, .github/workflows/**
```

## Recommended worktree

```bash
git worktree add ".worktrees/M7-003" -b "agent/M7-003-body-budget-policy" main
```

## Implementation sequence

1. Worktree from a base containing M7-002; record the owner gate and base commit.
2. Failing fixtures for: formula/clamping, above-ceiling startup rejection, no-config compatibility, framework-parsed enforcement point, raw-stream budgeted-read stop, dual-threshold rejection.
3. Implement the budget option, selection/clamping, and startup validation.
4. Implement framework-parsed and raw-stream enforcement paths.
5. Run every verification command exactly; create `docs/reports/issues/M7-003.md`; leave the worktree clean.

## Acceptance checklist

- [ ] Formula and clamping verified, including override-never-exceeds-ceiling.
- [ ] Above-ceiling configuration rejected at startup with a stable diagnostic.
- [ ] No-config behavior identical to today (regression).
- [ ] Framework-parsed oversized request never reaches validation/handler.
- [ ] Raw-stream route: budgeted reads stop on overflow; committed-response limitation documented and asserted where observable.
- [ ] Dual-threshold test observes the Lugas response path independently of the transport `413`.
- [ ] Documentation updated; exact commands/results in `docs/reports/issues/M7-003.md`; worktree clean.

## Verification commands

```bash
bun test tests/security
bun run verify
bun run verify:docs
```

## Evidence required

`docs/reports/issues/M7-003.md` per the evidence template, including the guarantee-split mapping and security considerations.

## Integration and merge notes

- Depends on M7-002 merged; merge after it to keep the hardening evidence intact.

## Agent stop point

Stop when acceptance and evidence are complete. Do not absorb this work into any other issue or vice versa.
