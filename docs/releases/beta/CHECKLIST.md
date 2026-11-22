# LugasJS v0.1.0-beta.6 Pre-Publication Checklist

| Field | Value |
|---|---|
| Package Source Commit | `8de2da488ae9dedd0a4428653944597e2f6c3429` (tag must point here) |
| Attestation Commit | `8de2da488ae9dedd0a4428653944597e2f6c3429` (checkout that ran the gate + builder) |
| Target Package | `lugas@0.1.0-beta.6` |
| Registry Target | `https://registry.npmjs.org/` with tag `beta` |

---

## Verified at Packet Assembly (executed by the builder — not aspirational)

- [x] **Repository Verification:** `bun run verify` executed by this builder with `LUGAS_PERF_RELEASE=1` — exit 0 (typecheck, tests, docs, diff, release-mode perf gate).
- [x] **Typecheck Integrity:** included in the builder-executed verify (`tsc --noEmit`, strict compiler options).
- [x] **Performance Gate:** release-mode gate executed during assembly; `release-evidence.json` records 0 blocking failures, 0 alerts, bound to the commits above.
- [x] **Package Rehearsal:** `release:package:rehearse` passed 34/34 checks with dry-run publication validated (`package-rehearsal.json`).
- [x] **Clean-Room Proof:** independent clean-room suite ran inside the builder-executed verify (`bun test`).
- [x] **Owner Decisions Recorded:** `docs/owner-decisions/naming-assets.md` (ODR-0001), `docs/owner-decisions/license-governance.md` (ODR-0002) — presence checked by the builder.
- [x] **Legal & Attribution:** `LICENSE` (full Apache-2.0), `NOTICE`, `SECURITY.md`, `GOVERNANCE.md` — presence checked by the builder.
- [x] **Two-Identity Attestation:** `release-evidence.json` (`lugas-release-evidence-v2`) binds `packageSourceCommit` and `attestationCommit`; the builder re-proved both bindings and the tarball hash at assembly time.
- [x] **Exact Tarball Preserved:** `lugas-0.1.0-beta.6.tgz` hash triple-checked (gate evidence = rehearsal result = actual bytes) and covered by `SHA256SUMS`.

## Owner Checks (not provable offline by the builder — verify before publishing)

- [ ] **Compatibility Matrix:** CI `.github/workflows/compatibility.yml` green across all 6 OS/Bun cells on the artifact commit.
- [ ] **No Open P0/P1:** issue tracker free of open P0/P1 defects at publication time.
- [ ] **Owner Release Gate Sign-Off:** M8-GATE approval recorded in `docs/reports/gates/M8.md` (GO verdict + post-GATE addenda).

---

## Post-Approval Execution (Owner Only — follow this exact order)

```bash
# 0. Preflight — FAIL-CLOSED (M6R6.1): any failed command, including the
#    successor-release assertions, aborts before the tag or publish runs.
set -euo pipefail
BETA_VERSION='0.1.0-beta.6'
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
git tag -a "v0.1.0-beta.6" "8de2da488ae9dedd0a4428653944597e2f6c3429" -m "LugasJS v0.1.0-beta.6 release candidate"
git push origin "v0.1.0-beta.6"

# 2. Publish the exact attested tarball
npm publish ./docs/releases/beta/lugas-0.1.0-beta.6.tgz \
  --access public \
  --tag beta \
  --registry=https://registry.npmjs.org/

# 3. Post-publication verification
npm view lugas@0.1.0-beta.6 version dist.integrity dist.tarball --registry=https://registry.npmjs.org/
npm dist-tag ls lugas   # REQUIRED: beta -> 0.1.0-beta.6 AND latest unchanged (verify the prior latest)

# 4. GitHub release with the attested artifacts
gh release create "v0.1.0-beta.6"   ./docs/releases/beta/lugas-0.1.0-beta.6.tgz   ./docs/releases/beta/SHA256SUMS   ./docs/releases/beta/provenance.json   ./docs/releases/beta/sbom.json   --title "v0.1.0-beta.6"   --notes-file ./docs/releases/beta/RELEASE_PACKET.md   --prerelease

# 5. Registry acceptance (post-publication) — execute the installed package,
#    not just metadata lookups. Download the registry tarball and compare it
#    to the attested digest, then run the exact-version consumer battery and
#    check BOTH dist-tags separately.
cd "$(mktemp -d)"
npm pack "lugas@0.1.0-beta.6" --registry=https://registry.npmjs.org/
echo "91621e479db1bbea4d1a5a9fb8e5a8cd5cf992db9e21bf96a264874c7f079612  lugas-0.1.0-beta.6.tgz" | sha256sum --check -
bun init -y >/dev/null 2>&1
bun add "lugas@0.1.0-beta.6" --registry=https://registry.npmjs.org/
bun -e 'const l = require("lugas"); if (typeof l.defineApp !== "function") process.exit(1); console.log("root export OK");'
bun -e 'const c = require("lugas/client"); if (typeof c.createClient !== "function") process.exit(1); console.log("client export OK");'
bunx lugas --version                          # must print: lugas v0.1.0-beta.6
npm view "lugas@0.1.0-beta.6" version         # 0.1.0-beta.6
npm dist-tag ls lugas                          # beta -> 0.1.0-beta.6; latest unchanged (verify the prior latest)
cd - >/dev/null
```

*Note: The version-list check in step 0 is not a reservation — npm itself rejects reuse of an existing name+version; re-verify immediately before step 2.*
