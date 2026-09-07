---
type: GitHub Issue
title: M7-002 — Pin delegated body-limit behavior and document transport-level rejection
status: draft
tags:
- github-issue
- m7
- security
- docs
generated:
  by: zcode/glm
  at: '2026-09-07T00:00:00+07:00'
issue:
  id: M7-002
  milestone: M7
  milestone_title: M7 — ColorJoy Same-Origin Application Delivery
  status: backlog
  priority: P0
  size: M
  area: security
  kind: hardening
  global_wave: 47
  milestone_wave: 1
  depends_on:
  - M6-GATE
  blocks:
  - M7-003
  - M7-GATE
  conflict_group: security-hardening
  owner_decision: false
  recommended_branch: agent/M7-002-pin-body-limit-behavior
  recommended_worktree: .worktrees/M7-002
  labels:
  - type:hardening
  - area:security
  - priority:p0
  - size:m
---

# M7-002 — Pin delegated body-limit behavior and document transport-level rejection

## Outcome

The delegated body ceiling is discoverable and its observed behavior is pinned by deterministic regressions and documented precisely — with **no new budget API**.

## Why this task exists

Server-wide body protection is an existing capability (`docs/body-limits.md`; the `maxRequestBodySize` pass-through; `tests/security/body-limits.test.ts`), but the option is unnamed in `SafeServeOptions`, the transport rejection shape is undocumented, and per-fixture expectations are loose. Owner decision ODR-0003: proceed under normal rules, hardening-only.

## Source documents

- [ADR-0019 — Body Budgets](../../decisions/0019-body-budget-policy.md) (context only — its API is **out of scope here**)
- `docs/body-limits.md` (updated by this issue)
- Probe record: `docs/proposals/colorjoy-same-origin-milestone.md`

## Dependency contract

- **Depends on:** M6-GATE
- **Blocks:** M7-003, M7-GATE
- **Global wave:** 47 · **Milestone wave:** 1 · **Conflict group:** `security-hardening`
- **Agent-ready when:** base is green and no other worktree owns `tests/security/body-limits.test.ts` or `docs/body-limits.md`.

## In scope

- Record `maxRequestBodySize` explicitly in `SafeServeOptions` (numeric byte limit), subject to repository type-surface rules.
- Deterministic fixtures: a valid oversized request, a valid streamed request without `Content-Length`, the exact boundary, and proof that rejected requests cannot mutate application state (handler never runs).
- Tighten status expectations to bare `413` **only** for well-formed oversized fixtures that demonstrably produce it — never a mechanical replacement of every `[400, 413, 500]` assertion; malformed framing and transport interruptions are separate cases with separate expectations.
- `docs/body-limits.md`: the bare `413` documented as observed and pinned transport behavior (not a Lugas Problem Details response), with the enforcement point (during consumption, before parsing/handlers).

## Non-goals

- Application-default or route-level budgets (M7-003, separately gated — per ODR-0003 they must not enter through this issue).
- Any second stream-counting layer over Bun.

## Owned files

```text
src/internal/prepared-app.ts
src/internal/serve.ts
tests/security/body-limits.test.ts
docs/body-limits.md
```

## Protected shared files

```text
src/index.ts, src/client/index.ts, src/testing/index.ts
package.json, bun.lock, tsconfig*.json, .github/workflows/**
```

## Recommended worktree

```bash
git worktree add ".worktrees/M7-002" -b "agent/M7-002-pin-body-limit-behavior" main
```

## Implementation sequence

1. Create the worktree; record the base commit.
2. Classify each existing fixture in `body-limits.test.ts` (what it actually sends) before changing any assertion.
3. Add the four deterministic fixtures; separate malformed-framing and transport-interruption cases.
4. Name and document `maxRequestBodySize` in `SafeServeOptions`.
5. Update `docs/body-limits.md`.
6. Run every verification command exactly; create `docs/reports/issues/M7-002.md`; leave the worktree clean.

## Acceptance checklist

- [ ] `maxRequestBodySize` is a named, typed, documented `SafeServeOptions` field.
- [ ] Oversized well-formed requests pin bare `413`; boundary and no-`Content-Length` streamed fixtures behave deterministically.
- [ ] Proof (test) that a rejected request never reaches handler/mutation code.
- [ ] Malformed framing and transport interruptions have their own cases and expectations.
- [ ] No assertion was weakened; each tightened expectation maps to a fixture that demonstrably produces the behavior.
- [ ] `docs/body-limits.md` states the transport-rejection distinction and enforcement point.
- [ ] Exact commands/results in `docs/reports/issues/M7-002.md`; worktree clean.

## Verification commands

```bash
bun test tests/security/body-limits.test.ts
bun run verify
bun run verify:docs
```

## Evidence required

`docs/reports/issues/M7-002.md` per the evidence template, including the per-fixture classification table and security considerations.

## Integration and merge notes

- Merge order with M7-001 is independent (disjoint owned files).
- M7-003 dispatch requires this issue merged **and** the owner's explicit go for the gated budget API.

## Agent stop point

Stop when acceptance and evidence are complete. Do not begin M7-003 work in this worktree.
