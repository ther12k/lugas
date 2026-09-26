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
BETA_VERSION='0.1.0-beta.5'
REGISTRY='https://registry.npmjs.org/'
( cd docs/releases/beta && sha256sum --check SHA256SUMS )
npm whoami >/dev/null                            # must be authenticated as the owner

# Successor-release check (beta.2+): the PACKAGE name is already claimed;
# what must be free is THIS VERSION. A successful, well-formed version-list
# response is REQUIRED — a failed or malformed lookup aborts (pipefail +
# node throw), never reads as "unpublished". Indeterminate ⇒ do not publish.
npm view lugas versions --json --registry="$REGISTRY" |
  node -e '
    const fs = require("node:fs");
    const versions = JSON.parse(fs.readFileSync(0, "utf8"));
    const candidate = process.argv[1];

    if (!Array.isArray(versions) || versions.length === 0 ||
        !versions.every(v => typeof v === "string")) {
      throw new Error("Invalid registry version list; abort.");
    }

    if (versions.includes(candidate)) {
      throw new Error("Candidate already published; stop and verify that release.");
    }
  ' "$BETA_VERSION"
# Reaching here: authenticated + registry reachable + candidate version absent.

# 1. Pin the reviewed source BEFORE the irreversible registry action
git tag -a "v0.1.0-beta.5" "6943f88d571266511ad53d826453bbf4413974cd" -m "LugasJS v0.1.0-beta.5 release candidate"
git push origin "v0.1.0-beta.5"

# 2. Publish the exact attested tarball
npm publish ./docs/releases/beta/lugas-0.1.0-beta.5.tgz \
  --access public \
  --tag beta \
  --registry=https://registry.npmjs.org/

# 3. Post-publication verification
npm view lugas@0.1.0-beta.5 version dist.integrity dist.tarball --registry=https://registry.npmjs.org/
npm dist-tag ls lugas   # REQUIRED: beta -> 0.1.0-beta.5 AND latest -> 0.1.0-beta.4 (unchanged)

# 4. GitHub release with the attested artifacts
gh release create "v0.1.0-beta.5"   ./docs/releases/beta/lugas-0.1.0-beta.5.tgz   ./docs/releases/beta/SHA256SUMS   ./docs/releases/beta/provenance.json   ./docs/releases/beta/sbom.json   --title "v0.1.0-beta.5"   --notes-file ./docs/releases/beta/RELEASE_PACKET.md   --prerelease

# 5. Registry acceptance (post-publication) — execute the installed package,
#    not just metadata lookups. Download the registry tarball and compare it
#    to the attested digest, then run the exact-version consumer battery and
#    check BOTH dist-tags separately.
cd "$(mktemp -d)"
npm pack "lugas@0.1.0-beta.5" --registry=https://registry.npmjs.org/
echo "50fd13565eab587329ee5674331a4d46539ad476db3666c7e6aecb2870da1732  lugas-0.1.0-beta.5.tgz" | sha256sum --check -
bun init -y >/dev/null 2>&1
bun add "lugas@0.1.0-beta.5" --registry=https://registry.npmjs.org/
bun -e 'const l = require("lugas"); if (typeof l.defineApp !== "function") process.exit(1); console.log("root export OK");'
bun -e 'const c = require("lugas/client"); if (typeof c.createClient !== "function") process.exit(1); console.log("client export OK");'
bunx lugas --version                          # must print: lugas v0.1.0-beta.5
npm view "lugas@0.1.0-beta.5" version         # 0.1.0-beta.5
npm dist-tag ls lugas                          # beta -> 0.1.0-beta.5; latest -> 0.1.0-beta.4 (unchanged)
cd - >/dev/null
```

*Note: The version-list check in step 0 is not a reservation — npm itself rejects reuse of an existing name+version; re-verify immediately before step 2.*

*Erratum (CA-19, 2026-09-13): this checklist's preflight block was corrected after packet assembly — `BETA_VERSION` is now assigned before use, and the candidate-absence check now requires a well-formed version-list response instead of inferring absence from a failed lookup. Only `CHECKLIST.md` and `SHA256SUMS` changed; the attested tarball (`50fd1356…`) and all other packet artifacts are byte-identical to the `61aee0a` assembly.*
