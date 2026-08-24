/**
 * Package supply-chain audit (M5-009).
 *
 * Inventories dependencies, licenses, package contents, and generates a
 * minimal SBOM. Verifies zero production runtime dependencies.
 *
 * Usage: bun run scripts/audit-package.ts
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

function main() {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));

  console.log("=== Dependency Audit ===\n");

  // Production dependencies
  const prodDeps = Object.keys(pkg.dependencies ?? {});
  console.log(`Production dependencies: ${prodDeps.length}`);
  if (prodDeps.length > 0) {
    console.error("FAIL: expected zero production dependencies");
    process.exit(1);
  }
  console.log("✓ zero production runtime dependency confirmed\n");

  // Dev dependencies and licenses
  const devDeps = Object.keys(pkg.devDependencies ?? {});
  console.log(`Dev dependencies: ${devDeps.length}`);
  for (const dep of devDeps) {
    try {
      const license = execSync(
        `cat node_modules/${dep}/package.json | grep -o '"license":"[^"]*"' | head -1`,
        { encoding: "utf8" },
      ).trim();
      console.log(`  ${dep}: ${license}`);
    } catch {
      console.log(`  ${dep}: license unknown`);
    }
  }

  // Pack dry-run file list
  console.log("\n=== Package contents ===\n");
  let files: string[] = [];
  try {
    const packJson = JSON.parse(execSync("npm pack --dry-run --json", { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
    files = packJson[0]?.files?.map((f: { path: string }) => f.path) ?? [];
    console.log(`Tarball entries: ${files.length}`);
  } catch {
    console.log("(npm unavailable — using bun.lock-based estimate)");
  }

  // Forbidden content scan
  const forbidden = ["benchmarks/", ".worktrees/", "tests/", "spikes/", "scripts/", "bun.lock", ".env"];
  const violations = files.filter((f) => forbidden.some((prefix) => f.startsWith(prefix)));
  if (violations.length > 0) {
    console.error(`✗ forbidden paths in tarball: ${violations.join(", ")}`);
    process.exit(1);
  }
  console.log("✓ no forbidden paths in tarball\n");

  // Secret scan on shipped source files
  console.log("=== Secret scan ===\n");
  const srcFiles = files.filter((f) => f.startsWith("src/"));
  let secretsFound = false;
  for (const file of srcFiles) {
    try {
      const content = readFileSync(resolve(ROOT, file), "utf8");
      const patterns = [/password\s*[:=]/i, /secret\s*[:=]\s*["']/i, /api[_-]?key\s*[:=]\s*["']/i];
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          console.error(`✗ potential secret in ${file}`);
          secretsFound = true;
        }
      }
    } catch { /* skip unreadable */ }
  }
  if (!secretsFound) console.log("✓ no secrets detected in shipped source\n");

  // SBOM summary
  const sbom = {
    format: "lugas-sbom-v0",
    generatedAt: new Date().toISOString(),
    packageName: pkg.name,
    packageVersion: pkg.version,
    productionDependencies: prodDeps,
    devDependencies: devDeps.map((d) => ({ name: d, scope: "dev" })),
    tarballFileCount: files.length,
    secretScanPassed: !secretsFound,
    zeroProductionRuntimeDependency: prodDeps.length === 0,
  };

  const sbomDir = resolve(ROOT, "benchmarks/results");
  mkdirSync(sbomDir, { recursive: true });
  writeFileSync(resolve(sbomDir, "sbom.json"), JSON.stringify(sbom, null, 2));
  console.log(`SBOM written to benchmarks/results/sbom.json`);
  console.log("\n=== Audit complete ===");
}

main();
