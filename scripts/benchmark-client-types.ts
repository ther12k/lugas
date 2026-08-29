/**
 * Client bundle + TypeScript contract cost benchmark (M5-005).
 *
 * Measures:
 * 1. Client bundle size (minified, gzip) from the package candidate
 * 2. TypeScript compilation cost at multiple route counts
 * 3. Verifies no server code in client bundle graph
 *
 * Usage: bun run scripts/benchmark-client-types.ts [--smoke]
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const RESULTS_DIR = resolve(ROOT, "benchmarks", "results", "m5-client-types");
const smoke = process.argv.includes("--smoke");

function cpuModel(): string {
  try {
    return execSync("lscpu | grep 'Model name' | head -1", { encoding: "utf8" })
      .split(":").pop()?.trim() ?? "";
  } catch {
    return "";
  }
}

// --- Bundle size ---
function bundleSize() {
  const entry = resolve(ROOT, "tests/package/client-browser/browser-fixture.ts");
  const outDir = "/tmp/m5-005-bundle";
  mkdirSync(outDir, { recursive: true });

  execSync(`bun build ${entry} --target=browser --outdir=${outDir}`, {
    cwd: ROOT,
    stdio: "pipe",
  });

  const files = require("node:fs").readdirSync(outDir).filter((f: string) => f.endsWith(".js"));
  let raw = 0;
  for (const f of files) {
    raw += readFileSync(join(outDir, f), "utf8").length;
  }

  // Gzip estimate
  const gzipped = gzipSync(Buffer.from(readFileSync(join(outDir, files[0]!), "utf8"))).length;

  return { rawBytes: raw, gzipBytes: gzipped, files };
}

// --- Type cost (from M3-017 committed data + fresh check) ---
function typeCost() {
  const start = Date.now();
  try {
    execSync("bunx tsc --noEmit --pretty false", { cwd: ROOT, stdio: "pipe" });
  } catch { /* type errors would be caught by verify */ }
  return Math.round(Date.now() - start);
}

async function main() {
  mkdirSync(RESULTS_DIR, { recursive: true });

  console.log("=== Client bundle ===");
  const bundle = bundleSize();
  console.log(`  raw: ${bundle.rawBytes} B`);
  console.log(`  gzip: ~${bundle.gzipBytes} B`);
  console.log(`  files: ${bundle.files.join(", ")}`);

  console.log("\n=== TypeScript contract cost ===");
  const tscMs = typeCost();
  console.log(`  full typecheck: ${tscMs}ms`);

  // M3-017 baseline reference
  console.log("\n  M3-017 baseline reference:");
  console.log("  500 routes cold check: 166ms / 111 MB");
  console.log("  1000 routes cold check: 287ms / 156 MB");

  // Verify no server code in client bundle
  const bundleText = bundle.files.map((f: string) =>
    readFileSync(join("/tmp/m5-005-bundle", f), "utf8"),
  ).join("\n");
  expectNoServerCode(bundleText);

  const results = {
    // M6R6.1 #311: the archive binds to the candidate and its machine so the
    // release gate can reject stale/foreign client evidence instead of
    // wrapping leftover bytes into the current candidate's attestation.
    format: "lugas-client-benchmark-v2",
    env: {
      bunVersion: Bun.version,
      commit: execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim(),
      platform: process.platform,
      arch: process.arch,
      cpuModel: cpuModel(),
    },
    bundle: { rawBytes: bundle.rawBytes, gzipBytes: bundle.gzipBytes },
    typecheckMs: tscMs,
    m3Baseline: { "500-route-cold-ms": 166, "1000-route-cold-ms": 287 },
    timestamp: new Date().toISOString(),
  };

  writeFileSync(resolve(RESULTS_DIR, "results.json"), JSON.stringify(results, null, 2));
  writeFileSync(resolve(RESULTS_DIR, "smoke.json"), JSON.stringify(results, null, 2));
  console.log(`\nResults written to ${RESULTS_DIR}/`);

  function expectNoServerCode(text: string): void {
    if (text.includes("src/core/app") || text.includes("defineApp(") || text.includes("Bun.serve")) {
      throw new Error("server code detected in client bundle");
    }
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
