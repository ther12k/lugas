# LugasJS v0.1.0-beta.1 Pre-Publication Checklist

| Field | Value |
|---|---|
| Package Source Commit | `0b79f09959263599dca16eb9128269cda9d6f285` (tag must point here) |
| Attestation Commit | `0b79f09959263599dca16eb9128269cda9d6f285` (checkout that ran the gate + builder) |
| Target Package | `lugas@0.1.0-beta.1` |
| Registry Target | `https://registry.npmjs.org/` with tag `beta` |

---

## Verified at Packet Assembly (executed by the builder — not aspirational)

- [x] **Repository Verification:** `bun run verify` executed by this builder with `LUGAS_PERF_RELEASE=1` — exit 0 (typecheck, tests, docs, diff, release-mode perf gate).
- [x] **Typecheck Integrity:** included in the builder-executed verify (`tsc --noEmit`, strict compiler options).
- [x] **Performance Gate:** release-mode gate executed during assembly; `release-evidence.json` records 0 blocking failures, 0 alerts, bound to the commits above.
- [x] **Package Rehearsal:** `release:package:rehearse` passed 16/16 checks with dry-run publication validated (`package-rehearsal.json`).
- [x] **Clean-Room Proof:** independent clean-room suite ran inside the builder-executed verify (`bun test`).
- [x] **Owner Decisions Recorded:** `docs/owner-decisions/naming-assets.md` (ODR-0001), `docs/owner-decisions/license-governance.md` (ODR-0002) — presence checked by the builder.
- [x] **Legal & Attribution:** `LICENSE` (full Apache-2.0), `NOTICE`, `SECURITY.md`, `GOVERNANCE.md` — presence checked by the builder.
- [x] **Two-Identity Attestation:** `release-evidence.json` (`lugas-release-evidence-v2`) binds `packageSourceCommit` and `attestationCommit`; the builder re-proved both bindings and the tarball hash at assembly time.
- [x] **Exact Tarball Preserved:** `lugas-0.1.0-beta.1.tgz` hash triple-checked (gate evidence = rehearsal result = actual bytes) and covered by `SHA256SUMS`.

## Owner Checks (not provable offline by the builder — verify before publishing)

- [ ] **Compatibility Matrix:** CI `.github/workflows/compatibility.yml` green across all 6 OS/Bun cells on the artifact commit.
- [ ] **No Open P0/P1:** issue tracker free of open P0/P1 defects at publication time.
- [ ] **Owner Release Gate Sign-Off:** M6-GATE approval recorded in `docs/reports/gates/M6.md` (GO verdict + post-GATE addenda).

---

## Post-Approval Execution (Owner Only — follow this exact order)

```bash
# 0. Preflight — FAIL-CLOSED (M6R6.1): any failed command, including the
#    namespace assertion, aborts before the tag or publish runs.
set -euo pipefail
( cd docs/releases/beta && sha256sum --check SHA256SUMS )
npm whoami >/dev/null                            # must be authenticated as the owner
if npm view lugas version >/dev/null 2>&1; then  # the name MUST still be unclaimed
  echo "ERROR: npm package 'lugas' is no longer unclaimed — do not publish; contact the owner" >&2
  exit 1
fi

# 1. Pin the reviewed source BEFORE the irreversible registry action
git tag -a "v0.1.0-beta.1" "0b79f09959263599dca16eb9128269cda9d6f285" -m "LugasJS v0.1.0-beta.1 release candidate"
git push origin "v0.1.0-beta.1"

# 2. Publish the exact attested tarball
npm publish ./docs/releases/beta/lugas-0.1.0-beta.1.tgz --access public --tag beta

# 3. Post-publication verification
npm view lugas@0.1.0-beta.1 version dist.integrity dist.tarball
npm dist-tag ls lugas                        # beta -> 0.1.0-beta.1 (NOT latest)

# 4. GitHub release with the attested artifacts
gh release create "v0.1.0-beta.1"   ./docs/releases/beta/lugas-0.1.0-beta.1.tgz   ./docs/releases/beta/SHA256SUMS   ./docs/releases/beta/provenance.json   ./docs/releases/beta/sbom.json   --title "v0.1.0-beta.1"   --notes-file ./docs/releases/beta/RELEASE_PACKET.md   --prerelease
```

*Note: The namespace check in step 0 is not a reservation — re-verify immediately before step 2.*
