---
type: GitHub Issue
title: M7-004 — Add application service lifecycle with drain-ordered shutdown
status: draft
tags:
- github-issue
- m7
- architecture
- lifecycle
generated:
  by: zcode/glm
  at: '2026-09-07T00:00:00+07:00'
issue:
  id: M7-004
  milestone: M7
  milestone_title: M7 — ColorJoy Same-Origin Application Delivery
  status: backlog
  priority: P1
  size: L
  area: core
  kind: feature
  global_wave: 48
  milestone_wave: 2
  depends_on:
  - M6-GATE
  blocks:
  - M7-GATE
  conflict_group: core-lifecycle
  owner_decision: false
  recommended_branch: agent/M7-004-service-lifecycle-shutdown
  recommended_worktree: .worktrees/M7-004
  labels:
  - type:feature
  - area:core
  - priority:p1
  - size:l
---

# M7-004 — Add application service lifecycle with drain-ordered shutdown

## Outcome

Services declare async init/dispose; shutdown follows stop-accepting → drain (requests and tracked tasks) under a deadline → reverse-order disposal → failure reporting, with the outcome semantics and invariant of [ADR-0020](../../decisions/0020-application-service-lifecycle.md) (accepted, ODR-0003).

## Why this task exists

Applications hand-roll signal handling and cleanup with no defined relationship between shutdown and requests still using their resources. This lifecycle is the prerequisite for any production-readiness claim for the planned SSE helper.

## Source documents

- [ADR-0020 — Application Service Lifecycle with Drain-Ordered Shutdown](../../decisions/0020-application-service-lifecycle.md)
- [ADR-0007 — Request Pipeline Lifecycle](../../decisions/0007-minimal-request-lifecycle.md) (unchanged boundary)
- Prior evidence: `docs/reports/m4-test-lifecycle.md`, `docs/reports/m5-cancellation.md`

## Dependency contract

- **Depends on:** M6-GATE
- **Blocks:** M7-GATE
- **Global wave:** 48 · **Milestone wave:** 2 · **Conflict group:** `core-lifecycle`
- **Agent-ready when:** base is green and no other worktree owns `src/core/app.ts` or `src/internal/serve.ts` (coordinate with M7-001's conflict group if waves overlap — these two issues do not share a wave).

## In scope

- Service init (declaration order, pre-traffic) and startup-failure disposal of already-initialized services.
- Drain deadline with documented default and override; deadline expiry reports an **unsuccessful/incomplete outcome**; resources possibly still in use are **not** disposed merely because connections closed.
- Three distinct reported outcomes: connection closure, tracked-work completion, disposal completion — never one "stopped" boolean.
- Idempotent shutdown; programmatic stop driving the same path as signals; opt-in SIGINT/SIGTERM handling only.
- Tracked-work boundary documented: detached (unawaited, unregistered) work is not accounted; no implicit process exit; no task-orchestration system.
- The invariant regression: handler begins database-dependent work → deadline expires → connection force-closed → handler attempts to continue → resource not closed underneath; outcome reported non-cooperating; never fabricated success.

## Non-goals

- Per-request hook families (ADR-0007 boundary holds).
- Implicit signal listeners on import; implicit process exit; generalized task orchestration.

## Owned files

```text
src/internal/lifecycle.ts (new)
src/core/app.ts
src/internal/serve.ts
tests/lifecycle/ (new)
docs/api-reference.md
```

## Protected shared files

```text
src/index.ts (public export — integrator)
package.json, bun.lock, tsconfig*.json, .github/workflows/**
```

## Recommended worktree

```bash
git worktree add ".worktrees/M7-004" -b "agent/M7-004-service-lifecycle-shutdown" main
```

## Implementation sequence

1. Worktree; record base commit.
2. Failing fixtures: init/dispose ordering, startup-failure disposal, drain deadline, invariant sequence, idempotence, signal opt-in, resource-count baseline over repeated cycles.
3. Implement the lifecycle coordinator around `server.stop()` / `server.stop(true)`.
4. Implement outcome reporting with three distinct signals.
5. Run every verification command exactly; create `docs/reports/issues/M7-004.md`; leave the worktree clean.

## Acceptance checklist

- [ ] Init runs in declaration order before traffic; startup failure disposes initialized services and propagates.
- [ ] In-flight database-backed request completes permitted work before its service disposes (within deadline).
- [ ] Invariant sequence passes: no resource closed underneath continuing work; outcome reported non-cooperating; no fabricated success.
- [ ] Connection closure, tracked-work completion, and disposal completion are separately observable.
- [ ] Shutdown idempotent; programmatic stop equals the signal path; signals opt-in only.
- [ ] Repeated connect/disconnect/shutdown cycles return resource counts to baseline.
- [ ] Documentation states the tracked-work boundary; exact commands/results in `docs/reports/issues/M7-004.md`; worktree clean.

## Verification commands

```bash
bun test tests/lifecycle
bun run verify
bun run verify:docs
```

## Evidence required

`docs/reports/issues/M7-004.md` per the evidence template, including the invariant-sequence trace and resource-count evidence.

## Integration and merge notes

- Coordinate `src/core/app.ts`/`src/internal/serve.ts` ownership with any in-flight M7-001 wave (disjoint waves by plan).

## Agent stop point

Stop when acceptance and evidence are complete. SSE helper work is a later, separately gated decision.
