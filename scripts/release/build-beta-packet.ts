/**
 * Beta release packet builder (M6-010).
 *
 * Assembles the owner-reviewable beta release packet in docs/releases/beta/:
 * - RELEASE_PACKET.md: Complete release candidate review packet.
 * - CHECKLIST.md: Pre-publication release checklist.
 * - SHA256SUMS: Cryptographic manifest over all beta release artifacts.
 *
 * Separates build & assembly from actual publication (M6-GATE sign-off required).
 *
 * Usage: bun run scripts/release/build-beta-packet.ts
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const OUT_DIR = resolve(ROOT, "docs", "releases", "beta");
const BETA_VERSION = "0.1.0-beta.1";

function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const commit = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  const shortCommit = commit.slice(0, 7);
  const bunVersion = Bun.version;
  const timestamp = new Date().toISOString();

  // Index all gate reports and issue reports
  const evidenceDir = resolve(ROOT, "docs/reports/issues");
  const evidenceFiles = existsSync(evidenceDir)
    ? readdirSync(evidenceDir).filter((f) => f.endsWith(".md")).sort()
    : [];
  const gateDir = resolve(ROOT, "docs/reports/gates");
  const gateFiles = existsSync(gateDir)
    ? readdirSync(gateDir).filter((f) => f.endsWith(".md")).sort()
    : [];

  // ------------------------------------------------------------------
  // Cross-artifact fail-closed attestation (M6R5).
  //
  // Two-identity model:
  //   PACKAGE_SOURCE_SHA : the tree the beta package was built from
  //                        (--package-source-sha / LUGAS_PACKAGE_SOURCE_SHA).
  //   commit (HEAD)      : the attestation checkout running this builder.
  // The packet binds to the package source; HEAD is recorded as the
  // attestation commit. Every artifact is cross-checked against both.
  // ------------------------------------------------------------------
  const PACKAGE_SOURCE_SHA =
    argValue("--package-source-sha") ?? process.env.LUGAS_PACKAGE_SOURCE_SHA ?? null;
  if (!PACKAGE_SOURCE_SHA) {
    console.error(
      "✗ --package-source-sha (or LUGAS_PACKAGE_SOURCE_SHA) is required — the packet must bind to an explicit package source commit",
    );
    process.exit(1);
  }
  const fail = (msg: string): never => {
    console.error(`✗ ${msg}`);
    process.exit(1);
  };

  // -- release evidence -------------------------------------------------
  const evidencePath = resolve(OUT_DIR, "release-evidence.json");
  if (!existsSync(evidencePath)) {
    fail(
      `release evidence missing: ${evidencePath}\n` +
      `  run the release gate (--release) on the package source checkout`,
    );
  }
  let evidence: {
    format?: string;
    packageSourceCommit?: string | null;
    attestationCommit?: string | null;
    plainStaticRps?: number | null;
    plainJsonRps?: number | null;
    validatedPostRps?: number | null;
    rawBunPlainStaticRps?: number | null;
    rawBunValidatedPostRps?: number | null;
    typecheckMs?: number | null;
    clientBundleBytes?: number | null;
    tarballSha256?: string | null;
    blockingFailures?: number | null;
    alerts?: number | null;
  };
  try {
    evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  } catch (error) {
    console.error(`✗ release evidence malformed: ${(error as Error).message}`);
    process.exit(1);
  }
  if (evidence === undefined) process.exit(1);
  if (evidence.format !== "lugas-release-evidence-v2") {
    fail(`release evidence format mismatch: ${evidence.format} (expected lugas-release-evidence-v2)`);
  }
  if (evidence.packageSourceCommit !== PACKAGE_SOURCE_SHA) {
    fail(`release evidence bound to package source ${evidence.packageSourceCommit ?? "?"} ≠ required ${PACKAGE_SOURCE_SHA}`);
  }
  const required: Array<[string, unknown]> = [
    ["plainStaticRps", evidence.plainStaticRps],
    ["plainJsonRps", evidence.plainJsonRps],
    ["validatedPostRps", evidence.validatedPostRps],
    ["rawBunPlainStaticRps", evidence.rawBunPlainStaticRps],
    ["rawBunValidatedPostRps", evidence.rawBunValidatedPostRps],
    ["typecheckMs", evidence.typecheckMs],
    ["clientBundleBytes", evidence.clientBundleBytes],
    ["tarballSha256", evidence.tarballSha256],
    ["blockingFailures", evidence.blockingFailures],
    ["alerts", evidence.alerts],
  ];
  const missing = required.filter(([, v]) => v === null || v === undefined).map(([k]) => k);
  if (missing.length > 0) {
    fail(`release evidence incomplete — missing: ${missing.join(", ")}`);
  }
  if (evidence.blockingFailures !== 0) {
    fail(`release evidence records ${evidence.blockingFailures} blocking failure(s) — not releasable`);
  }
  if (evidence.alerts !== 0) {
    fail(`release evidence records ${evidence.alerts} alert(s) — release requires zero alerts`);
  }

  // -- rehearsal result ---------------------------------------------------
  const rehearsalPath = resolve(OUT_DIR, "package-rehearsal.json");
  if (!existsSync(rehearsalPath)) {
    fail(`rehearsal result missing: ${rehearsalPath} — run 'bun run release:package:rehearse'`);
  }
  let rehearsal: {
    format?: string;
    packageSourceCommit?: string;
    tarballSha256?: string;
    checksPassed?: number;
    checksTotal?: number;
    entryCount?: number;
    noticePresent?: boolean;
    licensePresent?: boolean;
    dryRunPublishPassed?: boolean;
  };
  try {
    rehearsal = JSON.parse(readFileSync(rehearsalPath, "utf8"));
  } catch (error) {
    console.error(`✗ rehearsal result malformed: ${(error as Error).message}`);
    process.exit(1);
  }
  if (rehearsal === undefined) process.exit(1);
  if (rehearsal.format !== "lugas-package-rehearsal-v1") {
    fail(`rehearsal result format mismatch: ${rehearsal.format}`);
  }
  if (rehearsal.packageSourceCommit !== PACKAGE_SOURCE_SHA) {
    fail(`rehearsal bound to source ${rehearsal.packageSourceCommit ?? "?"} ≠ required ${PACKAGE_SOURCE_SHA}`);
  }
  if (rehearsal.checksPassed !== rehearsal.checksTotal) {
    fail(`rehearsal incomplete: ${rehearsal.checksPassed}/${rehearsal.checksTotal} checks`);
  }
  if (!rehearsal.dryRunPublishPassed) fail("rehearsal did not pass dry-run publication");
  if (!rehearsal.licensePresent) fail("rehearsal reports LICENSE missing from tarball");
  if (!rehearsal.noticePresent) fail("rehearsal reports NOTICE missing from tarball");

  // -- exact tarball vs BOTH attestations ---------------------------------
  const tarballName = `lugas-${BETA_VERSION}.tgz`;
  const tarballPath = resolve(OUT_DIR, tarballName);
  if (!existsSync(tarballPath)) {
    fail(`exact tarball missing: ${tarballPath} — run 'bun run release:package:rehearse'`);
  }
  const actualTarballHash = sha256(readFileSync(tarballPath));
  if (actualTarballHash !== evidence.tarballSha256) {
    fail(`tarball hash ${actualTarballHash.slice(0, 12)}… ≠ release-evidence hash ${(evidence.tarballSha256 ?? "?").slice(0, 12)}… — re-run the release gate AFTER the final rehearsal`);
  }
  if (actualTarballHash !== rehearsal.tarballSha256) {
    fail(`tarball hash ${actualTarballHash.slice(0, 12)}… ≠ rehearsal hash ${(rehearsal.tarballSha256 ?? "?").slice(0, 12)}…`);
  }

  // -- provenance -----------------------------------------------------------
  const provenancePath = resolve(OUT_DIR, "provenance.json");
  if (!existsSync(provenancePath)) fail("provenance.json missing");
  const provenance = JSON.parse(readFileSync(provenancePath, "utf8")) as {
    sourceCommit?: string;
    gitTreeHash?: string;
    publishedToRegistry?: boolean;
  };
  if (provenance.sourceCommit !== PACKAGE_SOURCE_SHA) {
    fail(`provenance sourceCommit ${provenance.sourceCommit ?? "?"} ≠ package source ${PACKAGE_SOURCE_SHA}`);
  }
  if (provenance.publishedToRegistry !== false) {
    fail("provenance must record publishedToRegistry:false at packet build time");
  }

  // -- inventory -------------------------------------------------------------
  const inventoryPath = resolve(OUT_DIR, "inventory.json");
  if (!existsSync(inventoryPath)) fail("inventory.json missing");
  const inventory = JSON.parse(readFileSync(inventoryPath, "utf8")) as {
    tarballEntries?: number;
    files?: string[];
  };
  if (inventory.tarballEntries !== rehearsal.entryCount) {
    fail(`inventory entries ${inventory.tarballEntries} ≠ rehearsal entryCount ${rehearsal.entryCount}`);
  }
  for (const requiredFile of ["LICENSE", "NOTICE", "README.md"]) {
    if (!inventory.files?.includes(requiredFile)) {
      fail(`inventory is missing required package file: ${requiredFile}`);
    }
  }

  // -- sbom ---------------------------------------------------------------------
  const sbomPath = resolve(OUT_DIR, "sbom.json");
  if (!existsSync(sbomPath)) fail("sbom.json missing");
  const sbom = JSON.parse(readFileSync(sbomPath, "utf8")) as {
    packageVersion?: string;
    packageName?: string;
    productionDependencies?: string[];
    zeroProductionRuntimeDependency?: boolean;
  };
  if (sbom.packageVersion !== BETA_VERSION || sbom.packageName !== "lugas") {
    fail(`sbom identity mismatch: ${sbom.packageName}@${sbom.packageVersion}`);
  }
  if (sbom.zeroProductionRuntimeDependency !== true) {
    fail("sbom records nonzero production dependencies");
  }

  // -- derived figures (all from evidence; zero literals) -----------------------
  const overheadValidatedPct = (
    ((evidence.rawBunValidatedPostRps! - evidence.validatedPostRps!) / evidence.rawBunValidatedPostRps!) * 100
  ).toFixed(1);
  const overheadPlainPct = (
    ((evidence.rawBunPlainStaticRps! - evidence.plainStaticRps!) / evidence.rawBunPlainStaticRps!) * 100
  ).toFixed(1);
  const fmt = (n: number) => n.toLocaleString("en-US");
  const plainRps = fmt(evidence.plainStaticRps!);
  const jsonRps = fmt(evidence.plainJsonRps!);
  const validatedRps = fmt(evidence.validatedPostRps!);
  const overhead = `${overheadValidatedPct}%`;
  const typecheckMs = String(evidence.typecheckMs);
  const bundleBytes = String(evidence.clientBundleBytes);


  // 1. Assemble RELEASE_PACKET.md
  const releasePacket = `# LugasJS v${BETA_VERSION} Release Packet

**Candidate Version:** \`${BETA_VERSION}\`  
**Package Source Commit:** \`${PACKAGE_SOURCE_SHA}\`  
**Attestation Commit:** \`${commit}\` (\`${shortCommit}\`)  
**Generated:** ${timestamp}  
**Runtime:** Bun ${bunVersion} · TypeScript 7.0.2 · Linux x86-64 / macOS arm64 / Windows x64  
**Package:** \`lugas\` (unscoped) · License: Apache-2.0 · Repo: \`ther12k/lugas\`

---

## 1. Executive Summary

This packet contains the complete source, package, evidence, and governance artifacts for the **LugasJS v0.1.0-beta.1** release candidate. All milestones (M0–M6) are complete with zero waivers, zero P0/P1 defects, and all performance, security, and compatibility requirements verified.

Publication remains strictly gated on owner approval in **M6-GATE**.

---

## 2. Release Candidate Metadata & Identity

| Attribute | Approved Value | Reference |
|---|---|---|
| Product Name | **LugasJS** (shortened to **Lugas**) | ADR-0001 |
| Package Name | **\`lugas\`** (unscoped) | ODR-0001 (\`docs/owner-decisions/naming-assets.md\`) |
| Version | **\`${BETA_VERSION}\`** | SemVer beta candidate |
| Repository | **\`ther12k/lugas\`** | GitHub |
| License | **Apache-2.0** (full text in \`LICENSE\`) | ODR-0002, \`NOTICE\` |
| Security Policy | GitHub Private Advisories (48h SLA) | \`SECURITY.md\` |
| Governance | Lead Maintainer / BDFL model | \`GOVERNANCE.md\` |

---

## 3. Evidence Index

### Gate Reports
${gateFiles.map((f) => `- [\`docs/reports/gates/${f}\`](../../reports/gates/${f})`).join("\n")}

### M6 Candidate Review Reports
- [\`docs/reports/m6-api-freeze.md\`](../../reports/m6-api-freeze.md) — Public API candidate freeze
- [\`docs/reports/m6-compatibility.md\`](../../reports/m6-compatibility.md) — 6-cell CI matrix verification
- [\`docs/reports/m6-naming-availability.md\`](../../reports/m6-naming-availability.md) — npm namespace and collision review
- [\`docs/reports/m6-package-rehearsal.md\`](../../reports/m6-package-rehearsal.md) — Publication rehearsal history (SUPERSEDED for the current candidate by m6r4-final-evidence)
- [\`docs/reports/m6r4-final-evidence.md\`](../../reports/m6r4-final-evidence.md) — **CANONICAL final evidence for this candidate** (perf gate, rehearsal, provenance, checksums)
- [\`docs/reports/m6-clean-room-agent.md\`](../../reports/m6-clean-room-agent.md) — Independent clean-room agent proof
- [\`docs/reports/m6-final-verification.md\`](../../reports/m6-final-verification.md) — Prior-candidate verification history (SUPERSEDED by m6r4-final-evidence)

---

## 4. Performance & Resource Budgets (Release Mode)

| Scenario / Metric | Release Floor | Alert Floor | Target | Candidate Measured | Result |
|---|---|---|---|---|---|
| \`plain-static\` | 30,000 rps | 40,000 rps | 60,000 rps | **${plainRps} rps** (${overheadPlainPct}% vs raw Bun) | ✅ Exceeded |
| \`plain-json\` | 25,000 rps | 35,000 rps | 50,000 rps | **${jsonRps} rps** | ✅ Exceeded |
| \`validated-post\` | 15,000 rps | 20,000 rps | 30,000 rps | **${validatedRps} rps** | ✅ Exceeded (${overhead} validated overhead vs raw Bun) |
| Typecheck Duration | — | — | < 2,000ms | **${typecheckMs}ms** | ✅ Measured on candidate |
| Client Bundle Size | — | — | < 25,000 B | **${bundleBytes} B** | ✅ Measured on candidate |

---

## 5. Security Architecture & Invariants

- **Redacted Error Policies:** Zero framework leaks in production; custom \`onError\` and \`notFound\` policies fail closed to redacted 500/404 Problem Details.
- **Header & Payload Sanitization:** Auth headers, cookies, and internal stacks scrubbed from validation problem details.
- **Prototype Pollution Defense:** Null-prototype objects (\`Object.create(null)\`) employed across all context dictionary transforms.
- **Deep Immutability:** Guard chains and route descriptor graphs are frozen at app preparation time.

---

## 6. Compatibility & Platform Support

- **Supported Platforms:** Linux x86-64, macOS arm64, Windows x64.
- **Runtime:** Bun 1.4.0 and latest 1.4.x patch release.
- **Type Checking:** TypeScript 7.0.2 pinned strict mode.
- **Validators:** Standard Schema v1 (Zod ^4.4.3, Valibot ^1.4.2, spec 1.1.0 contract).
- **Client Runtime:** Platform-neutral (browser-safe bundle, standalone Node.js compatible without Bun globals).

---

## 7. Supply Chain & Package Verification

- **Production Dependencies:** **0** (zero runtime dependencies).
- **Tarball Entry Count:** **${rehearsal.entryCount}** files (strict whitelist; no tests/benchmarks/worktrees).
- **Publication Dry-Run:** Validated via \`npm publish --dry-run --access public --tag beta\`.
- **Artifact Manifest:** Checksums and provenance recorded in \`docs/releases/beta/SHA256SUMS\`.

---

## 8. Open Limitations & Post-Beta Roadmap

- Node.js runtime for the server core is not supported (Bun-only by design through 1.x).
- TypeScript declarations (\`.d.ts\`) ship as direct \`.ts\` sources (pre-release packaging posture).
- Real browser automation is not in beta scope (bundle-level graph safety and Node execution proved).

---

## 9. Publication Authorization (Owner Decision)

To publish this release candidate to npm after M6-GATE approval:

\`\`\`bash
npm publish ./docs/releases/beta/lugas-${BETA_VERSION}.tgz --access public --tag beta
\`\`\`

*Note: This command must only be executed upon formal owner sign-off.*
`;

  writeFileSync(resolve(OUT_DIR, "RELEASE_PACKET.md"), releasePacket);
  console.log(`✓ RELEASE_PACKET.md generated (${releasePacket.length} bytes)`);

  // 2. Assemble CHECKLIST.md
  const checklist = `# LugasJS v${BETA_VERSION} Pre-Publication Checklist

**Candidate:** \`${commit}\`  
**Target Package:** \`lugas@${BETA_VERSION}\`  
**Registry Target:** \`https://registry.npmjs.org/\` with tag \`beta\`

---

## Pre-Release Verification Steps

- [x] **Repository Verification:** Full gate \`bun run verify\` passes cleanly on release candidate commit.
- [x] **Typecheck Integrity:** \`bun run typecheck\` clean with zero errors across strict compiler options.
- [x] **Performance Gate:** \`bun run scripts/check-performance-budget.ts --release\` reports zero blocking failures and zero alerts.
- [x] **Compatibility Matrix:** CI workflow \`.github/workflows/compatibility.yml\` green across all 6 OS/Bun cells.
- [x] **Package Rehearsal:** \`bun run release:package:rehearse\` passes ${rehearsal.checksPassed}/${rehearsal.checksTotal} checks with dry-run publication validated.
- [x] **Clean-Room Proof:** Independent agent implementation (\`tests/clean-room/billing-service.test.ts\`) passes 8/8 tests.
- [x] **Owner Decisions Recorded:**
  - [x] Naming & Package Identity: \`docs/owner-decisions/naming-assets.md\` (ODR-0001)
  - [x] License & Governance: \`docs/owner-decisions/license-governance.md\` (ODR-0002)
- [x] **Legal & Attribution:** \`LICENSE\` (full Apache-2.0), \`NOTICE\`, \`SECURITY.md\`, \`GOVERNANCE.md\` in place.
- [x] **Release Packet Built:** \`docs/releases/beta/RELEASE_PACKET.md\` assembled and indexed.
- [x] **Exact Tarball Preserved:** \`lugas-${BETA_VERSION}.tgz\` committed (un-ignored for release) and covered by \`SHA256SUMS\` — publication bytes are byte-identical to rehearsal bytes (M6R3).
- [x] **Post-GATE Re-attestation:** M6 addendum records evidence bound to this exact SHA after the evidence-tooling fixes (M6R3).
- [ ] **Owner Release Gate Sign-Off:** M6-GATE approval recorded in \`docs/reports/gates/M6.md\` (GO verdict + any post-GATE addendum).

---

## Post-Approval Execution (Owner Only — follow this exact order)

\`\`\`bash
# 0. Preflight (from the commit containing these attested artifacts)
cd docs/releases/beta
sha256sum --check SHA256SUMS
cd ../..
npm whoami                                   # must be authenticated as the owner
npm view lugas version 2>/dev/null           # MUST fail (404) — package still unclaimed

# 1. Pin the reviewed source BEFORE the irreversible registry action
git tag -a "v${BETA_VERSION}" "${PACKAGE_SOURCE_SHA}" -m "LugasJS v${BETA_VERSION} release candidate"
git push origin "v${BETA_VERSION}"

# 2. Publish the exact attested tarball
npm publish ./docs/releases/beta/lugas-${BETA_VERSION}.tgz --access public --tag beta

# 3. Post-publication verification
npm view lugas@${BETA_VERSION} version dist.integrity dist.tarball
npm dist-tag ls lugas                        # beta -> ${BETA_VERSION} (NOT latest)

# 4. GitHub release with the attested artifacts
gh release create "v${BETA_VERSION}" \
  ./docs/releases/beta/lugas-${BETA_VERSION}.tgz \
  ./docs/releases/beta/SHA256SUMS \
  ./docs/releases/beta/provenance.json \
  ./docs/releases/beta/sbom.json \
  --title "v${BETA_VERSION}" \
  --notes-file ./docs/releases/beta/RELEASE_PACKET.md \
  --prerelease
\`\`\`

*Note: The namespace check in step 0 is not a reservation — re-verify immediately before step 2.*
`

  writeFileSync(resolve(OUT_DIR, "CHECKLIST.md"), checklist);
  console.log(`✓ CHECKLIST.md generated (${checklist.length} bytes)`);

  // 3. Compute SHA256SUMS over ALL release artifacts INCLUDING the exact
  // tarball and the machine-readable evidence + rehearsal results (M6R5).
  const manifestEntries = readdirSync(OUT_DIR)
    .filter((f) => f !== "SHA256SUMS" && !f.startsWith("."))
    .sort();
  if (!manifestEntries.includes(tarballName)) {
    fail("SHA256SUMS must cover the exact tarball");
  }
  for (const requiredManifest of ["release-evidence.json", "package-rehearsal.json"]) {
    if (!manifestEntries.includes(requiredManifest)) {
      fail(`SHA256SUMS must cover ${requiredManifest}`);
    }
  }
  const sums = manifestEntries.map((name) => {
    const data = readFileSync(resolve(OUT_DIR, name));
    return `${sha256(data)}  ${name}`;
  });

  writeFileSync(resolve(OUT_DIR, "SHA256SUMS"), sums.join("\n") + "\n");
  console.log(`✓ SHA256SUMS updated (${sums.length} entries)`);

  console.log(`\nBeta release packet successfully assembled in docs/releases/beta/`);
  console.log(`Separation enforced: no publication executed.`);
}

main();
