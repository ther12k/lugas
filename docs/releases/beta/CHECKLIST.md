# LugasJS v0.1.0-beta.5 Pre-Publication Checklist

| Field | Value |
|---|---|
| Package Source Commit | `6943f88d571266511ad53d826453bbf4413974cd` (tag must point here) |
| Attestation Commit | `6943f88d571266511ad53d826453bbf4413974cd` (checkout that ran the gate + builder) |
| Target Package | `lugas@0.1.0-beta.5` |
| Registry Target | `https://registry.npmjs.org/` with tag `beta` |

---

## Verified at Packet Assembly (executed by the builder — not aspirational)

- [x] **Repository Verification:** `bun run verify` executed by this builder with `LUGAS_PERF_RELEASE=1` — exit 0 (typecheck, tests, docs, diff; release-mode perf gate DEFERRED — see below).
- [x] **Typecheck Integrity:** included in the builder-executed verify (`tsc --noEmit`, strict compiler options).
- [x] **Performance Gate:** **DEFERRED by ODR-0020** — not executed at assembly; the pinned baseline host was occupied and loaded-host measurements are void per `docs/performance-gates.md`. `release-evidence.json` records `perfGate: "deferred"` with null measurements, 0 blocking failures, 0 alerts, bound to the commits above. The full gate plus a fresh ≥5-run typecheck calibration run on the quiet baseline host before general-availability promotion; published versions are immutable, so a failing gate forces a successor version.
- [x] **Package Rehearsal:** `release:package:rehearse` passed 27/27 checks with dry-run publication validated (`package-rehearsal.json`).
- [x] **Clean-Room Proof:** independent clean-room suite ran inside the builder-executed verify (`bun test`).
- [x] **Owner Decisions Recorded:** `docs/owner-decisions/naming-assets.md` (ODR-0001), `docs/owner-decisions/license-governance.md` (ODR-0002) — presence checked by the builder.
- [x] **Legal & Attribution:** `LICENSE` (full Apache-2.0), `NOTICE`, `SECURITY.md`, `GOVERNANCE.md` — presence checked by the builder.
- [x] **Two-Identity Attestation:** `release-evidence.json` (`lugas-release-evidence-v2`) binds `packageSourceCommit` and `attestationCommit`; the builder re-proved both bindings and the tarball hash at assembly time.
- [x] **Exact Tarball Preserved:** `lugas-0.1.0-beta.5.tgz` hash triple-checked (gate evidence = rehearsal result = actual bytes) and covered by `SHA256SUMS`.

## Owner Checks (not provable offline by the builder — verify before publishing)

- [ ] **Compatibility Matrix:** CI `.github/workflows/compatibility.yml` green across all 6 OS/Bun cells on the artifact commit.
- [ ] **No Open P0/P1:** issue tracker free of open P0/P1 defects at publication time.
- [ ] **Owner Release Gate Sign-Off:** owner approval for publishing THIS candidate recorded at publication time (perf-gate deferral authorized by ODR-0020; owner executes the publication sequence personally)

---

## Post-Approval Execution (Owner Only — follow this exact order)

```bash
# 0. Preflight — FAIL-CLOSED (M6R6.1): any failed command, including the
#    successor-release assertions, aborts before the tag or publish runs.
set -euo pipefail
( cd docs/releases/beta && sha256sum --check SHA256SUMS )
npm whoami >/dev/null                            # must be authenticated as the owner

# Successor-release checks (beta.2+): the PACKAGE name is already claimed;
# what must be free is THIS VERSION — and an indeterminate registry answer
# (network, auth, unreachable) must ABORT, never be read as "unpublished".
if npm view "lugas@${BETA_VERSION}" version >/dev/null 2>&1; then
  echo "ERROR: lugas@${BETA_VERSION} is already published — bump the candidate version; never republish a used name+version" >&2
  exit 1
fi
if ! npm view lugas dist-tags >/dev/null 2>&1; then
  echo "ERROR: registry reachability could not be confirmed — indeterminate; do not publish" >&2
  exit 1
fi
# Reaching here: authenticated + registry reachable + candidate version absent.

# 1. Pin the reviewed source BEFORE the irreversible registry action
git tag -a "v0.1.0-beta.5" "6943f88d571266511ad53d826453bbf4413974cd" -m "LugasJS v0.1.0-beta.5 release candidate"
git push origin "v0.1.0-beta.5"

# 2. Publish the exact attested tarball
npm publish ./docs/releases/beta/lugas-0.1.0-beta.5.tgz --access public --tag beta

# 3. Post-publication verification
npm view lugas@0.1.0-beta.5 version dist.integrity dist.tarball
npm dist-tag ls lugas                        # beta -> 0.1.0-beta.5 (NOT latest)

# 4. GitHub release with the attested artifacts
gh release create "v0.1.0-beta.5"   ./docs/releases/beta/lugas-0.1.0-beta.5.tgz   ./docs/releases/beta/SHA256SUMS   ./docs/releases/beta/provenance.json   ./docs/releases/beta/sbom.json   --title "v0.1.0-beta.5"   --notes-file ./docs/releases/beta/RELEASE_PACKET.md   --prerelease
```

*Note: The namespace check in step 0 is not a reservation — re-verify immediately before step 2.*
