---
type: Evidence Report
title: Release-Readiness Sweep — 0.1.0-beta.5 preparation
status: complete
tags:
- evidence
- release
- sweep
- stabilization
---

# Release-readiness sweep (2026-09-12)

Preparation for `0.1.0-beta.5` — the owner-directed verification release
with **no new framework features**, existing to prove the corrected
publishing pipeline from the npm registry (CF-1). Lane: ODR-0018 release
engineering and documentation.

## Sweep findings and dispositions

| Area | Finding | Disposition |
|---|---|---|
| npm README | All README links were repo-relative (`./docs/…`, `examples/…`, including HTML `<a href>` in the header). npm never rewrites relative links, and the tarball ships no `docs/`/`examples/` trees — every documentation link 404'd on npmjs.com. | **Fixed**: all README links absolutized to `github.com/ther12k/lugas` blob/tree URLs. |
| npm metadata | Published package carries no `repository`, `bugs`, `homepage`, or `keywords` — the npm page does not link back to the project at all. | **Fixed**: injected into the staged packet by `scripts/release/package-beta.ts` (same pattern as `version`/`bin`/`publishConfig`; repo `package.json` stays `0.0.0` by convention and protected). |
| CF-3 engines (owner decision, 2026-09-12) | `engines: { bun: ">=1.4.0" }` added to the staged packet as **metadata, not enforcement** — npm treats engines as advisory without strict config, Bun's own engines support is still maturing, and `packageManager` was explicitly rejected (package-manager contract ≠ runtime support floor). Fail-closed assertion added to the rehearsal. | **Implemented** in `scripts/release/package-beta.ts`. |
| Broken links | Full-repo scan: every broken relative `.md` link (70) lives in `docs/releases/history/**` — the frozen historical evidence archive pointing at report paths from past gate states. **Zero** broken links in current guides, reference docs, README, or examples. | **Left as-is**: repointing frozen evidence would rewrite historical records; the OKF validator already gates the living bundle. |
| Version claims | Current docs (`docs/getting-started.md`, README) accurately say beta.4 is the published beta — correct today, stale the moment beta.5 publishes. | **Publish-time checklist** (below); not edited now so no doc claims an unpublished version. |
| Quiet-host perf | Host load average ~27 (owner's 24 h soak + unrelated jobs active). Per the measurement-conditions record (PR #395), loaded-machine numbers are not evidence. | **Deferred** until a quiet window; required before the 0.1.0 gate. |

## Verification

- `bun run typecheck` clean; `bun run verify:docs` pass; full `bun run verify` green in the worktree.
- The staged-metadata and stamping changes are exercised by `bun run release:package:rehearse` at the next packet build (it self-checks `engines.bun` and `frameworkVersion` from the installed tarball; previous run's evidence in `docs/reports/consumer-smoke-2026-09-12.md`).

## beta.5 owner checklist (in execution order)

1. `bun run release:package:rehearse` with `BETA_VERSION` bumped to
   `0.1.0-beta.4` → `0.1.0-beta.5` in `scripts/release/package-beta.ts`
   (stamps version + engines + metadata; attests the new artifact set).
2. Update version claims: `docs/getting-started.md` published-version note,
   README capability/version lines, changelog `[Unreleased]` →
   `[0.1.0-beta.5]` with the publish date and attested commit/tarball.
3. Commit the attested release packet (the regenerated
   `docs/releases/beta/` artifacts — legitimate now, unlike the PR #398
   rebuild which was reverted).
4. Publish (owner OTP): `npm publish lugas@<tarball>` under the `beta`
   dist-tag; `latest` move per the established owner-controlled flow.
5. **Registry consumer smoke re-run** against the published `beta.5` from a
   clean directory — the assertion that failed for beta.4 must pass:
   `manifest.frameworkVersion === "0.1.0-beta.5"`, CLI banner reports
   beta.5, all exports resolve, typed client + typecheck lanes green
   (protocol: `docs/reports/consumer-smoke-2026-09-12.md`).
6. Record the result in `docs/releases/beta/` evidence and update
   `docs/roadmap.md` release status.
