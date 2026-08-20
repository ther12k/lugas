---
type: GitHub Issue
title: M5-009 — Audit dependencies, licenses, package contents, and SBOM
status: draft
tags:
- github-issue
- m5
- security
- security
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M5-009
  milestone: M5
  milestone_title: M5 — Hardening and Private Alpha
  status: backlog
  priority: P0
  size: L
  area: security
  kind: security
  global_wave: 38
  milestone_wave: 1
  depends_on:
  - M4-GATE
  - M1-018
  - M3-018
  - M4-017
  blocks:
  - M5-017
  - M5-GATE
  - M6-003
  conflict_group: package-audit
  owner_decision: false
  recommended_branch: agent/M5-009-audit-dependencies-licenses-package-contents-and
  recommended_worktree: .worktrees/M5-009
  labels:
  - type:security
  - area:security
  - priority:p0
  - size:l
---

# M5-009 — Audit dependencies, licenses, package contents, and SBOM

## Outcome

Prove package supply-chain scope, license compatibility, zero-runtime-dependency target, and publish whitelist.

## Why this task exists

This task is a bounded unit in **M5 — Hardening and Private Alpha**. It unlocks **[M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md), [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md), [M6-003](../m6/M6-003-run-package-publication-dry-run-and-provenance-rehearsal.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Security And Threat Model](../../engineering/security-and-threat-model.md)
- [Dependency And Supply Chain](../../engineering/dependency-and-supply-chain.md)

## Dependency contract

- **Depends on:** [M4-GATE](../m4/M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md), [M1-018](../m1/M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md), [M3-018](../m3/M3-018-finalize-lugas-client-exports-and-packed-consumer-tests.md), [M4-017](../m4/M4-017-finalize-lugas-testing-and-cli-package-exports.md)
- **Blocks:** [M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md), [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md), [M6-003](../m6/M6-003-run-package-publication-dry-run-and-provenance-rehearsal.md)
- **Global wave:** 38
- **Milestone wave:** 1
- **Conflict group:** `package-audit`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Inventory direct/transitive production/dev dependencies and licenses.
- Generate a package tarball file list, SBOM, checksum, and secret scan.
- Review copied/adapted interfaces and attribution.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
scripts/audit-package.ts
docs/reports/m5-supply-chain.md
docs/THIRD_PARTY_NOTICES.md
```

The paths are the expected ownership boundary. Small adjacent test fixtures may be added when necessary, but shared-file changes require dispatcher/integrator approval and must be recorded in evidence.

## Protected shared files

```text
package.json (unless explicitly owned)
bun.lock (unless explicitly owned)
src/index.ts / src/client/index.ts / src/testing/index.ts (unless explicitly owned)
.github/workflows/** (unless explicitly owned)
docs/okf/delivery/backlog.md and issue-index.md
```

## Recommended worktree

```bash
git fetch --all --prune
git worktree add ".worktrees/M5-009" -b "agent/M5-009-audit-dependencies-licenses-package-contents-and" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Inventory direct/transitive production/dev dependencies and licenses.
5. Implement: Generate a package tarball file list, SBOM, checksum, and secret scan.
6. Implement: Review copied/adapted interfaces and attribution.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M5-009.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Production dependency count is verified from packed candidate.
- [ ] No disallowed file, worktree, raw profile, secret, or unpublished source artifact appears.
- [ ] Every dependency/license finding has disposition.
- [ ] SBOM/provenance method is documented and reproducible.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M5-009.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run audit:package
bun run package:dry-run
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M5-009.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

## Integration and merge notes

- Merge only after all dependencies are on the target branch.
- Rebase/update from the dependency-complete base before final CI.
- Preserve existing tests and evidence when resolving conflicts.
- The designated shared-file integrator performs exports, lockfile, and central-index edits not owned here.
- A failed acceptance criterion creates a correction/blocker issue; do not weaken the criterion silently.

## Rollback and recovery

The change must be revertible as one task without removing dependency evidence from other issues. For a failed spike or gate, retain the report, mark the outcome accurately, and stop downstream dispatch until the decision/correction is merged.

## Agent stop point

Stop when this issue's acceptance and evidence are complete. Do not begin any issue listed under **Blocks** in this worktree.
