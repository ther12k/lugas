# LugasJS v0.1.0-beta.1 Pre-Publication Checklist

**Candidate:** `1ba4e5dd28d7a061de2993fc60aa6de98f58f9eb`  
**Target Package:** `lugas@0.1.0-beta.1`  
**Registry Target:** `https://registry.npmjs.org/` with tag `beta`

---

## Pre-Release Verification Steps

- [x] **Repository Verification:** Full gate `bun run verify` passes cleanly on release candidate commit.
- [x] **Typecheck Integrity:** `bun run typecheck` clean with zero errors across strict compiler options.
- [x] **Performance Gate:** `bun run scripts/check-performance-budget.ts --release` reports zero blocking failures and zero alerts.
- [x] **Compatibility Matrix:** CI workflow `.github/workflows/compatibility.yml` green across all 6 OS/Bun cells.
- [x] **Package Rehearsal:** `bun run release:package:rehearse` passes 15/15 checks with dry-run publication validated.
- [x] **Clean-Room Proof:** Independent agent implementation (`tests/clean-room/billing-service.test.ts`) passes 8/8 tests.
- [x] **Owner Decisions Recorded:**
  - [x] Naming & Package Identity: `docs/owner-decisions/naming-assets.md` (ODR-0001)
  - [x] License & Governance: `docs/owner-decisions/license-governance.md` (ODR-0002)
- [x] **Legal & Attribution:** `LICENSE` (full Apache-2.0), `NOTICE`, `SECURITY.md`, `GOVERNANCE.md` in place.
- [x] **Release Packet Built:** `docs/releases/beta/RELEASE_PACKET.md` assembled and indexed.
- [ ] **Owner Release Gate Sign-Off:** M6-GATE approval recorded in `docs/reports/gates/M6-GATE.md`.

---

## Post-Approval Execution (Owner Only)

```bash
# 1. Publish to npm registry (owner execution only)
npm publish ./docs/releases/beta/lugas-0.1.0-beta.1.tgz --access public --tag beta

# 2. Tag release commit in Git
git tag -a "v0.1.0-beta.1" -m "LugasJS v0.1.0-beta.1 release candidate"
git push origin "v0.1.0-beta.1"

# 3. Create GitHub Release with RELEASE_PACKET.md notes
gh release create "v0.1.0-beta.1" ./docs/releases/beta/lugas-0.1.0-beta.1.tgz --title "v0.1.0-beta.1" --notes-file ./docs/releases/beta/RELEASE_PACKET.md --prerelease
```
