---
type: GitHub Issue
title: M7-001 — Add opt-in native asset routes with explicit API ownership and safe misses
status: draft
tags:
- github-issue
- m7
- architecture
- security
generated:
  by: zcode/glm
  at: '2026-09-07T00:00:00+07:00'
issue:
  id: M7-001
  milestone: M7
  milestone_title: M7 — ColorJoy Same-Origin Application Delivery
  status: backlog
  priority: P0
  size: L
  area: core
  kind: feature
  global_wave: 47
  milestone_wave: 1
  depends_on:
  - M6-GATE
  blocks:
  - M7-GATE
  conflict_group: core-routing
  owner_decision: false
  recommended_branch: agent/M7-001-opt-in-native-asset-routes
  recommended_worktree: .worktrees/M7-001
  labels:
  - type:feature
  - area:core
  - priority:p0
  - size:l
---

# M7-001 — Add opt-in native asset routes with explicit API ownership and safe misses

## Outcome

An opt-in asset configuration that mounts explicit file mappings and directory mounts under explicit URL prefixes as native Bun route values, with the request-ownership table, method contract, and security contract of [ADR-0018](../../decisions/0018-opt-in-public-asset-serving.md) implemented and tested.

## Why this task exists

Same-origin no-build applications need first-party asset serving; the handwritten workaround exposes development diagnostics on misses and entangles API and asset 404s. Approved by owner decision ODR-0003 (`docs/owner-decisions/colorjoy-adr-approvals.md`); acceptance anchor: ColorJoy deletes its custom static-serving implementation without changing API behavior or adding a frontend build requirement.

## Completion evidence

Completed in merged PR [#335](https://github.com/ther12k/lugas/pull/335), landed in `6d335bfa5ffd572dfca15fb14947127d88d57d21`. Final asset-security matrix evidence is [run 34087764865](https://github.com/ther12k/lugas/actions/runs/34087764865), which tested PR head `418aca29ce8984b7671795e68c9b9867cc543d89`; the run head and landed merge baseline are distinct provenance fields. Detailed acceptance mapping remains in `docs/reports/issues/M7-001.md`. This record is complete and is not reopened.

## Source documents

- [ADR-0018 — Opt-In Public Asset Serving Through the Bun Adapter](../../decisions/0018-opt-in-public-asset-serving.md)
- [ADR-0016 — Evidence-Gated Claims](../../decisions/0016-evidence-gated-claims.md)
- Milestone sequencing: `docs/proposals/colorjoy-same-origin-milestone.md`
- Prior evidence: `docs/reports/m5-native-route-security.md`

## Dependency contract

- **Depends on:** M6-GATE
- **Blocks:** M7-GATE
- **Global wave:** 47 · **Milestone wave:** 1 · **Conflict group:** `core-routing`
- **Agent-ready when:** the worktree base includes ODR-0003 and ADR-0018, CI is green on the base commit, and no other worktree owns `src/core/app.ts`.

## In scope

- Asset configuration surface (explicit file mappings, directory mounts under explicit prefixes), validated at `defineApp()` time; ambiguous API/asset ownership rejected at startup.
- Mounting through native route values, including the `{ GET: { dir } }` composition for the method contract (boundary cast pinned by tests).
- Not-found decision table implemented exactly per the ADR ownership table; SPA fallback explicitly out of scope.
- Tests: the six acceptance groups (routing and methods, native HTTP behavior, containment, disclosure, framework boundaries, consumer integration).
- Documentation: `docs/api-reference.md`, `docs/getting-started.md`.

## Non-goals

- Frontend compilation, SSR, SPA/navigation fallback, authenticated downloads, arbitrary Bun route injection, middleware systems.
- Route-level body budgets (M7-003), lifecycle APIs (M7-004), package-export changes (M7-005).
- Manifest changes: asset route values stay outside `lugas-manifest-v1` route facts.

## Owned files

```text
src/internal/assets.ts (new)
src/core/app.ts
src/internal/prepared-app.ts
src/internal/serve.ts
tests/static/ (new)
examples/static/ (new)
docs/api-reference.md
docs/getting-started.md
```

## Protected shared files

```text
src/index.ts (public export — integrator performs or approves)
.github/workflows/** (per-OS containment lanes — integrator)
package.json, bun.lock, tsconfig*.json
```

## Recommended worktree

```bash
git worktree add ".worktrees/M7-001" -b "agent/M7-001-opt-in-native-asset-routes" main
```

## Implementation sequence

1. Create the worktree from the dependency-complete base; record the base commit.
2. Write failing fixtures for the six test groups before implementation.
3. Implement configuration validation, classification, and native mounting.
4. Implement the ownership table and method contract through the assembled routing configuration.
5. Add per-platform containment lanes (coordinate the workflow change with the integrator).
6. Run every verification command exactly; record unavailable checks as unexecuted.
7. Create `docs/reports/issues/M7-001.md` from the evidence template; leave the worktree clean.

## Acceptance checklist

- [ ] Ownership table behaviors verified verbatim (API-owned, asset-owned, misses, methods, ambiguity).
- [ ] Both mapping forms obey the same method contract; HEAD sends no body; unsupported methods expose no file bytes.
- [ ] Method contract demonstrated through the assembled routing configuration; no 405 promised or required.
- [ ] Containment (encoded traversal, double-encoding, separators, symlinks, case variations) passes on every claimed platform.
- [ ] Disclosure regressions cover development and production modes; production assertions check status plus absence of seeded sensitive details (not Bun's exact wording).
- [ ] Framework-boundary row answered: guards/header policies/diagnostics/logging integrated or explicitly scoped to API requests in docs and tests.
- [ ] No-build browser fixture loads HTML/JS/CSS from the application origin and calls its API (stage one: existing `fetch`).
- [ ] Asset configuration absent → existing behavior preserved (regression).
- [ ] Manifest v1 unchanged; no asset routes in route facts.
- [ ] Exact commands/results in `docs/reports/issues/M7-001.md`; worktree clean.

## Verification commands

```bash
bun test tests/static
bun run verify
bun run verify:docs
```

## Evidence required

`docs/reports/issues/M7-001.md` per the evidence template: baseline, outcome, owned/adjacent files, acceptance mapping, exact commands/results, security considerations (containment, disclosure, boundary cast of the `{ GET: { dir } }` composition), limitations, deferred work, merge notes, clean state.

## Integration and merge notes

- The `src/index.ts` export and workflow lanes are integrator-performed; record them in evidence.
- Asset API is an approved post-freeze addition; the change must be revertible as one task.

## Agent stop point

Stop when acceptance and evidence are complete. Do not start M7-004/M7-005 work in this worktree.
