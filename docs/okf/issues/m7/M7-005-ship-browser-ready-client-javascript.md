---
type: GitHub Issue
title: M7-005 — Ship browser-ready client JavaScript
status: draft
tags:
- github-issue
- m7
- packaging
- client
- release
generated:
  by: zcode/glm
  at: '2026-09-07T00:00:00+07:00'
issue:
  id: M7-005
  milestone: M7
  milestone_title: M7 — ColorJoy Same-Origin Application Delivery
  status: backlog
  priority: P1
  size: L
  area: packaging
  kind: feature
  global_wave: 48
  milestone_wave: 2
  depends_on:
  - M6-GATE
  blocks:
  - M7-GATE
  conflict_group: packaging-exports
  owner_decision: false
  recommended_branch: agent/M7-005-browser-client-artifact
  recommended_worktree: .worktrees/M7-005
  labels:
  - type:feature
  - area:packaging
  - priority:p1
  - size:l
---

# M7-005 — Ship browser-ready client JavaScript

## Outcome

The release tarball carries a prebuilt, browser-executable ESM artifact of `lugas/client`, generated in CI from the same sources as the type contract, with the two-stage browser evidence and packaging changes of [ADR-0021](../../decisions/0021-prebuilt-browser-client-artifact.md) (accepted, ODR-0003).

## Why this task exists

A no-build browser cannot resolve the bare `lugas/client` specifier from an npm installation, so same-origin no-build applications cannot use the typed client. The maintainer performs compilation once; consumers never adopt a toolchain.

## Source documents

- [ADR-0021 — Prebuilt Browser-Executable Client Artifact](../../decisions/0021-prebuilt-browser-client-artifact.md)
- [ADR-0012 — One Package with Subpath Exports](../../decisions/0012-one-package-subpath-exports.md)
- `docs/compatibility.md` (bundle-level proof only, real browsers not executed in CI)

## Dependency contract

- **Depends on:** M6-GATE
- **Blocks:** M7-GATE
- **Global wave:** 48 · **Milestone wave:** 2 · **Conflict group:** `packaging-exports`
- **Agent-ready when:** base is green, ODR-0003 is on the base commit, and no other worktree owns `package.json` or the release scripts. This is the **single owning issue** for the protected export/packaging changes.

## In scope

- Browser-target ESM build of `lugas/client` added to the tarball; `.ts` sources remain the only type source of truth; no hand-maintained `.d.ts` fork.
- Minimal export-map surface for browser resolvability (exact specifier decided here, per the approved ADR scope — not a general export rewrite).
- Release pipeline: artifact regenerated per release; enters SBOM/attestation inventory; reproducible from the attested commit.
- Two distinct browser stages: stage one — plain-JS no-bundler fixture with ordinary `fetch` (browser-to-server evidence); stage two — fixture loading the **installed artifact** in a real browser (module resolution + correct JavaScript MIME type). Stage one may be prepared independently; it does not close stage two.
- Final acceptance anchor: the browser loads JavaScript from the installed release artifact, calls the application successfully, and handles successful responses, declared application failures, native empty errors, cancellation, and transport failures **without rebuilding client source or resolving anything from the source checkout**.
- Evidence records source SHA, tarball digest, unrelated temporary install path, browser/engine versions, and actual loaded module paths; this lane is same-origin only and does not imply CORS or browser-hosted Bun execution.
- Consumer fixture installs the packed artifact into an **unrelated temporary directory** with the source checkout out of the resolution path.
- Type-checking independence: `checkJs` and independent-`tsconfig` fixtures; the plain-JS demonstration requires no TypeScript configuration.
- Graph test: browser artifact pulls no server-runtime dependency.
- Documentation: the three consumption arrangements (same-origin serving per ADR-0018, import map, bundler).

## Non-goals

- General rewrite of package exports; separate client package; `.d.ts` fork; single-file HTML embedding; CORS coverage or a broad browser-matrix claim.

## Owned files

```text
scripts/release/package-beta.ts
build/ or dist output for the client artifact (new)
tests/browser/ (new)
tests/release/package-consumers/consumers.test.ts (extended)
docs/getting-started.md
docs/compatibility.md
```

## Protected shared files

```text
package.json (exports map — this issue owns the change; integrator merges)
bun.lock
src/index.ts, src/client/index.ts, src/testing/index.ts (no changes expected)
tsconfig*.json, .github/workflows/**
```

## Recommended worktree

```bash
git worktree add ".worktrees/M7-005" -b "agent/M7-005-browser-client-artifact" main
```

## Implementation sequence

1. Worktree; record base commit and the ODR-0003 gate.
2. Failing fixtures for the two browser stages, temp-dir consumer install, checkJs/tsconfig independence, and the graph test.
3. Add the build step and export-map change; wire into the release/attestation pipeline.
4. Run every verification command exactly, including the packed-tarball consumer flow; create `docs/reports/issues/M7-005.md`; leave the worktree clean.

## Acceptance checklist

- [ ] Artifact present in the packed tarball; reproducible from the attested commit; in the SBOM.
- [ ] Stage-two fixture passes in a real browser against a live server using only the installed artifact.
- [ ] Temp-dir consumer fixture resolves nothing from the source checkout.
- [ ] `checkJs` and independent-tsconfig fixtures pass; plain-JS demo needs no TypeScript configuration.
- [ ] Graph test proves no server-runtime dependency in the browser artifact.
- [ ] Existing bundler consumers unaffected (sources remain; regression).
- [ ] Documentation covers the three consumption arrangements; exact commands/results in `docs/reports/issues/M7-005.md`; worktree clean.

## Verification commands

```bash
bun test tests/browser tests/release
bun run verify
bun run verify:docs
```

## Evidence required

`docs/reports/issues/M7-005.md` per the evidence template, including build reproducibility, SBOM delta, and the two-stage browser evidence.

## Integration and merge notes

- Single owning issue for the protected `package.json` export change; the designated integrator merges.
- The integrated no-build acceptance fixture (with M7-001) joins when both issues are ready.

## Agent stop point

Stop when acceptance and evidence are complete. Do not extend the export rewrite beyond the approved artifact.
