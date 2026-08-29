# LugasJS v0.1.0-beta.1 Pre-Publication Checklist

**Candidate:** `d2a07b213bc719097c88340a177e68737aa10301`  
**Target Package:** `lugas@0.1.0-beta.1`  
**Registry Target:** `https://registry.npmjs.org/` with tag `beta`

---

## Pre-Release Verification Steps

- [x] **Repository Verification:** Full gate `bun run verify` passes cleanly on release candidate commit.
- [x] **Typecheck Integrity:** `bun run typecheck` clean with zero errors across strict compiler options.
- [x] **Performance Gate:** `bun run scripts/check-performance-budget.ts --release` reports zero blocking failures and zero alerts.
- [x] **Compatibility Matrix:** CI workflow `.github/workflows/compatibility.yml` green across all 6 OS/Bun cells.
- [x] **Package Rehearsal:** `bun run release:package:rehearse` passes all checks (incl. NOTICE assertion) with dry-run publication validated.
- [x] **Clean-Room Proof:** Independent agent implementation (`tests/clean-room/billing-service.test.ts`) passes 8/8 tests.
- [x] **Owner Decisions Recorded:**
  - [x] Naming & Package Identity: `docs/owner-decisions/naming-assets.md` (ODR-0001)
  - [x] License & Governance: `docs/owner-decisions/license-governance.md` (ODR-0002)
- [x] **Legal & Attribution:** `LICENSE` (full Apache-2.0), `NOTICE`, `SECURITY.md`, `GOVERNANCE.md` in place.
- [x] **Release Packet Built:** `docs/releases/beta/RELEASE_PACKET.md` assembled and indexed.
- [x] **Exact Tarball Preserved:** `lugas-0.1.0-beta.1.tgz` committed and covered by `SHA256SUMS` — publication bytes are byte-identical to rehearsal bytes (M6R3/M6R4).
- [x] **Post-GATE Re-attestation:** M6R3/M6R4 addenda record evidence bound to this exact SHA.
- [ ] **Owner Release Gate Sign-Off:** M6-GATE approval recorded in `docs/reports/gates/M6.md` (GO verdict + any post-GATE addendum).

---

## Post-Approval Execution (Owner Only)

```bash
# 0. Preflight (from the commit containing these attested artifacts)
sha256sum --check docs/releases/beta/SHA256SUMS
npm whoami                                   # must be authenticated as the owner
npm view lugas version 2>/dev/null           # MUST fail (package still unclaimed)

# 1. Pin the reviewed source BEFORE the irreversible registry action
git tag -a "v${BETA_VERSION}" "${commit}" -m "LugasJS v${BETA_VERSION} release candidate"
git push origin "v${BETA_VERSION}"

# 2. Publish to npm registry (owner execution only)
npm publish ./docs/releases/beta/lugas-${BETA_VERSION}.tgz --access public --tag beta

# 3. Post-publication verification
npm view lugas@${BETA_VERSION} version dist.integrity dist.tarball
npm dist-tag ls lugas                        # beta -> 0.1.0-beta.1 (NOT latest)

# 4. GitHub release with the exact attested artifacts
gh release create "v${BETA_VERSION}" ./docs/releases/beta/lugas-${BETA_VERSION}.tgz \
  --title "v${BETA_VERSION}" --notes-file ./docs/releases/beta/RELEASE_PACKET.md --prerelease
```

*Note: The package namespace check in step 0 is not a reservation — re-verify immediately before step 2.*
