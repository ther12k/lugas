/**
 * CPU and heap profiling for the Lugas server (M5-006).
 *
 * Uses Bun's built-in --cpu-prof and --heap-prof flags to generate
 * profiling artifacts. Profiling runs are SEPARATE from timing runs.
 *
 * Usage: bun run scripts/profile/cpu-heap.ts [--smoke]
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const PROFILE_DIR = resolve(ROOT, "benchmarks", "profiles");
const smoke = process.argv.includes("--smoke");

const durationMs = smoke ? 500 : 2_000;

function profileScenario(name: string, entryScript: string): void {
  const cpuDir = join(PROFILE_DIR, name);
  mkdirSync(cpuDir, { recursive: true });

  // Write a simple server script that runs for the specified duration
  const serverScript = `
    import { defineApp } from "${resolve(ROOT, "src/index")}";
    const app = defineApp({
      routes: {
        "/bench": { GET: () => new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } }) },
      },
    });
    const server = app.serve({ port: 0, development: false });
    console.log("PORT:" + server.port);
    setTimeout(() => { server.stop(true); process.exit(0); }, ${durationMs});
  `;

  const scriptPath = join(cpuDir, "server.ts");
  writeFileSync(scriptPath, serverScript);

  console.log(`Profiling ${name} (${durationMs}ms)...`);

  // CPU profile
  const cpuProc = Bun.spawnSync(
    [process.execPath, "--cpu-prof", "--cpu-prof-dir", cpuDir, "run", scriptPath],
    { cwd: ROOT, timeout: durationMs + 5_000, stdout: "pipe", stderr: "pipe" },
  );
  const stdout = new TextDecoder().decode(cpuProc.stdout);
  console.log(`  exit=${cpuProc.exitCode}, output: ${stdout.split("\n")[0]?.slice(0, 60)}`);

  // Heap profile
  const heapProc = Bun.spawnSync(
    [process.execPath, "--heap-prof", "--heap-prof-dir", cpuDir, "run", scriptPath],
    { cwd: ROOT, timeout: durationMs + 5_000, stdout: "pipe", stderr: "pipe" },
  );
  console.log(`  heap exit=${heapProc.exitCode}`);
}

async function main() {
  mkdirSync(PROFILE_DIR, { recursive: true });

  profileScenario("lugas-json", "");
  profileScenario("lugas-static", "");

  // Metafile from browser bundle build
  console.log("\nGenerating metafile...");
  const metaProc = Bun.spawnSync(
    ["bun", "build", resolve(ROOT, "tests/package/client-browser/browser-fixture.ts"), "--target=browser", "--outfile", join(PROFILE_DIR, "metafile.js")],
    { cwd: ROOT, stdout: "pipe", stderr: "pipe" },
  );
  console.log(`  metafile build exit=${metaProc.exitCode}`);

  // Summary
  const summary = `# Profiling Report (M5-006)\n\nGenerated: ${new Date().toISOString()}\nDuration per scenario: ${durationMs}ms\n\nArtifacts in benchmarks/profiles/:\n- lugas-json/ — CPU + heap profiles\n- lugas-static/ — CPU + heap profiles\n- metafile.js — browser bundle metafile\n`;
  writeFileSync(join(PROFILE_DIR, "summary.md"), summary);
  console.log(`\nSummary written to ${PROFILE_DIR}/summary.md`);
}

main().catch(console.error);
