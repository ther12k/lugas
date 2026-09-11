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

## beta.5 owner checklist (full release chain, revised 2026-09-12)

Two structural corrections from the candidate-prep review: the candidate
version is now **single-sourced** in
`scripts/release/candidate-version.ts` (imported by the packager, the
packet builder, and the release-mode performance gate — three independent
literals previously could, and did, diverge), and **quiet-host benchmark
evidence is required before packet attestation**, because the packet
builder consumes `release-evidence.json` (written only by release-mode
verify, which hashes the final tarball) and refuses to assemble without
it. A dev-mode verify with perf SKIP is not release verification.

1. **Candidate inputs committed.** Version is already single-sourced at
   `0.1.0-beta.5`; the tarball README is evergreen (no publication-state
   claims); working tree clean before anything runs.
2. **Quiet-host benchmark, bound to the candidate source commit** (the
   measurement-conditions record, PR #395, governs: idle host, no
   concurrent load). The soak window must be over. Loaded-machine numbers
   are never recorded as PASS and never rebaselined.
3. **`bun run release:package:rehearse`** — final tarball (stamps
   `frameworkVersion`, version, engines, and consumer metadata; verifies
   staging AND the installed tarball). Partial evidence on its own.
4. **`LUGAS_PERF_RELEASE=1 bun run verify`** — release-mode verification
   against the rehearsed tarball; writes `release-evidence.json`
   (including the tarball sha256). This step actually running is the
   acceptance criterion — a perf SKIP on a clean checkout is not it.
5. **`bun run scripts/release/build-beta-packet.ts --package-source-sha <sha>`**
   — assembles the packet (requires the benchmark archives, zero
   failures/alerts, and the release evidence; re-executes verification).
   The generated CHECKLIST.md preflight now handles successor releases:
   it asserts the candidate *version* is unpublished and treats
   indeterminate registry answers (network/auth) as aborts.
6. **Commit the attested packet**; provenance keeps the true source-commit
   identity (the packet-storage commit's hash is never substituted).
7. **Publish — owner action, owner-authenticated** (no credentials in
   chat), only after the packet is valid:

   ```bash
   npm publish ./docs/releases/beta/lugas-0.1.0-beta.5.tgz \
     --access public \
     --tag beta
   ```

   Explicit tarball path and explicit `--tag beta` (npm's default tag is
   `latest`). `latest` does not move without a separate owner decision.
8. **Post-publish acceptance battery** — install the exact version in a
   clean directory (`bun add lugas@0.1.0-beta.5`), then verify:
   - sha256 of the registry tarball == sha256 of the attested candidate;
   - `package.version === "0.1.0-beta.5"`;
   - `manifest.frameworkVersion === "0.1.0-beta.5"` (the CF-1 assertion);
   - `bunx --bun lugas routes` banner reports beta.5;
   - metadata (exact values, keywords included) + all five exports;
   - full consumer battery PASS (protocol:
     `docs/reports/consumer-smoke-2026-09-12.md`).
   Dist-tags verified separately: `beta` → `0.1.0-beta.5`, `latest`
   unchanged unless the owner moves it.
9. Record results in `docs/releases/beta/` evidence, `docs/roadmap.md`
   release status, and the `docs/` version claims (accurately beta.4 until
   this point).

**Candidate acceptance invariants:** packager version == packet-builder
version == hashed-tarball version; actual tarball sha256 == the hash in
`package-rehearsal.json` == the hash in `release-evidence.json`;
release-mode verification actually executed (never a perf SKIP standing in
for it).

## Performance evidence status

Pending — deliberately not run under load (owner soak active, load average
~27 at sweep time). Per the measurement-conditions record (PR #395): a
loaded-machine result is not quiet-host evidence and must not be recorded
as PASS; the beta.5 packet attestation itself now requires it (step 2 of
the chain above), and no threshold re-baselining from loaded numbers.
