---
type: Owner Decision Record
title: 'ODR-0006: M7-003 Dispatch — Application-Default and Route-Specific Body Budgets'
status: accepted
tags:
- owner-decision
- m7
- body-limits
- security
---

# ODR-0006: M7-003 Dispatch — Application-Default and Route-Specific Body Budgets

## Context

With M7-001 (PR #335), M7-002 (PR #334), M7-005 (PR #339), and M7-004
(PR #341) landed with complete evidence, M7-003 was the milestone's last
incomplete member, blocked per [ODR-0003](colorjoy-adr-approvals.md) on this
explicit owner go. The owner gave that go on 2026-09-08, directing
continuation of the recommended sequence.

## Decision

1. **M7-003 is dispatched** for implementation under its accepted contract:
   [ADR-0019 as amended](../okf/decisions/0019-body-budget-policy.md)
   (selection chain, clamping, startup rejection, framework-parsed vs
   raw-stream guarantee split) and the M7-003 issue record.
2. **Raw-stream narrowing authority:** per the accepted amendment, the
   implementation may adopt the permitted narrower form — budget
   configuration on routes without a declared framework-parsed body is
   **rejected at startup** rather than enforced through a raw-stream budgeted
   interface. The rejection must be a stable startup diagnostic, documented,
   and never a silently inert budget.
3. **Ceiling knowledge:** the server ceiling is the serve-time
   `maxRequestBodySize` (M7-002) when explicitly configured. Above-ceiling
   startup rejection applies against that configured ceiling; when no
   ceiling is configured, Bun's runtime default governs and budgets enforce
   as configured. This interpretation is recorded in the evidence report.
4. **Boundaries unchanged:** bare `413` transport rejection shape stays
   pinned (M7-002); no second transport counting layer; Lugas-level
   rejections use the Problem Details envelope; M7-GATE membership
   unchanged until evidence is complete.

## Effect

- The M7-003 worktree may be created from a green base containing this record.
- On completion, M7-GATE has no incomplete declared dependencies.
