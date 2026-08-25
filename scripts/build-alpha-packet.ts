/**
 * Alpha release packet builder (M5-017).
 *
 * Assembles the private alpha review packet: evidence index, checksums,
 * compatibility/performance/security summaries, and open limitations.
 *
 * Usage: bun run scripts/build-alpha-packet.ts
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const OUT_DIR = resolve(ROOT, "docs", "releases", "alpha");

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function main() {
  const commit = execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  const bunVersion = Bun.version;
  const timestamp = new Date().toISOString();

  // Evidence index
  const evidenceDir = resolve(ROOT, "docs/reports/issues");
  const evidenceFiles = readdirSync(evidenceDir).filter((f) => f.endsWith(".md")).sort();
  const gateFiles = readdirSync(resolve(ROOT, "docs/reports/gates"))
    .filter((f) => f.endsWith(".md")).sort();

  // Performance summary
  let perfSummary = "See docs/reports/m5-plain-performance.md, m5-validation-performance.md, m5-client-type-size.md";
  try {
    const plain = JSON.parse(readFileSync(resolve(ROOT, "benchmarks/results/m5-plain/results.json"), "utf8"));
    perfSummary = JSON.stringify(plain.env);
  } catch { /* archived results may not exist in clean checkout */ }

  // Security summary reference
  const securityRef = "docs/reports/m5-security-review.md";

  // Open limitations
  const openLimitations = [
    "macOS/Windows untested (Linux x86-64 only)",
    ".d.ts declarations deferred to release tooling",
    "Opaque browser redirects not exercised",
    "In-flight handler work NOT cancelled on client disconnect",
    "{dir} entries require real filesystem path",
  ];

  const report = `# Lugas Private Alpha Release Packet

Commit: ${commit}
Generated: ${timestamp}
Bun: ${bunVersion}

## Evidence Index

### Gate reports
${gateFiles.map((f) => `- docs/reports/gates/${f}`).join("\n")}

### Issue evidence reports
${evidenceFiles.map((f) => `- docs/reports/issues/${f}`).join("\n")}

## Compatibility Summary

Linux x86-64 verified. macOS/Windows untested.
Bun 1.4.x required; TypeScript 7.0.2.

## Performance Summary

Environment: ${perfSummary}
Detailed reports: docs/reports/m5-*-performance.md

## Security Summary

Security review: ${securityRef}
Zero P0/P1 findings open.

## Open Limitations

${openLimitations.map((l) => `- ${l}`).join("\n")}

## Alpha Stop Point

This packet marks the end of the private alpha milestone (M5).
No registry publication or public repository action has occurred.
Next step: M6 beta preparation requires owner decisions on
package ownership, license, and governance.
`;

  writeFileSync(resolve(OUT_DIR, "RELEASE_PACKET.md"), report);

  // Checksums
  const checksums = evidenceFiles.map((f) => {
    const content = readFileSync(resolve(evidenceDir, f), "utf8");
    return `${sha256(content)}  docs/reports/issues/${f}`;
  });
  for (const f of gateFiles) {
    const content = readFileSync(resolve(ROOT, "docs/reports/gates", f), "utf8");
    checksums.push(`${sha256(content)}  docs/reports/gates/${f}`);
  }
  checksums.push(`${sha256(report)}  docs/releases/alpha/RELEASE_PACKET.md`);

  writeFileSync(
    resolve(OUT_DIR, "SHA256SUMS"),
    checksums.sort().join("\n") + "\n",
  );

  console.log(`Alpha release packet assembled:`);
  console.log(`  docs/releases/alpha/RELEASE_PACKET.md (${report.length} bytes)`);
  console.log(`  docs/releases/alpha/SHA256SUMS (${checksums.length} entries)`);
  console.log(`\nNo registry/public repository action has occurred.`);
}

main();
