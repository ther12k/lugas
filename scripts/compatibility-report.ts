/**
 * Compatibility report generator (M5-010).
 *
 * Records the current platform/runtime environment for the compatibility matrix.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

function main() {
  const report = {
    timestamp: new Date().toISOString(),
    bunVersion: Bun.version,
    platform: process.platform,
    arch: process.arch,
    cpuModel: (() => {
      try { return execSync("lscpu | grep 'Model name' | head -1", { encoding: "utf8" }).split(":").pop()?.trim() ?? ""; } catch { return ""; }
    })(),
    memoryTotalMb: (() => {
      try {
        const m = require("node:fs").readFileSync("/proc/meminfo", "utf8");
        return Math.round(parseInt(m.match(/MemTotal:\s+(\d+)/)![1]!, 10) / 1024);
      } catch { return 0; }
    })(),
    commit: execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim(),
  };
  const outPath = resolve(ROOT, "benchmarks/results", `compat-${process.platform}-${report.bunVersion}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`Compatibility report written to ${outPath}`);
}

main();
