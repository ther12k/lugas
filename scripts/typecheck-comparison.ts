/**
 * Paired typecheck comparison (CA-12, #415 amendment): compiles the SAME
 * workloads against two source revisions and records timings, compiler
 * diagnostics, and environment identity.
 *
 * Workloads per revision:
 * - full repository   (each revision's own tsconfig — the budget's workload)
 * - consumer fixture  (one IDENTICAL fixed file exercising APIs present at
 *   both revisions; compiled with a pinned flag set mirroring the repo
 *   tsconfig minus DOM: --lib esnext --types bun)
 *
 * Five timed runs per cell (median reported); diagnostics collected
 * separately (--extendedDiagnostics, --listFilesOnly file counts).
 *
 * Usage:
 *   bun run scripts/typecheck-comparison.ts <earlier-worktree> <current-worktree> <out.json>
 */
import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

const [earlierDir, currentDir, outPath] = process.argv.slice(2);
if (!earlierDir || !currentDir || !outPath) {
  console.error("usage: bun run scripts/typecheck-comparison.ts <earlier> <current> <out.json>");
  process.exit(1);
}

const TSC = join("node_modules", ".bin", "tsc");
const FIXTURE_FLAGS = [
  "--noEmit", "--ignoreConfig", "--strict", "--exactOptionalPropertyTypes",
  "--noUncheckedIndexedAccess", "--verbatimModuleSyntax", "--isolatedModules",
  "--target", "esnext", "--module", "esnext", "--moduleResolution", "bundler",
  "--lib", "esnext", "--types", "bun", "--skipLibCheck", "consumer-fixture.ts",
] as const;

const decode = (data: Uint8Array): string => new TextDecoder().decode(data);

function spawnText(args: readonly string[], cwd: string): { exitCode: number; stdout: string; stderr: string } {
  const proc = Bun.spawnSync(["./" + TSC, ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  return { exitCode: proc.exitCode, stdout: decode(proc.stdout), stderr: decode(proc.stderr) };
}

async function timedRun(args: readonly string[], cwd: string): Promise<number> {
  const t0 = performance.now();
  const proc = Bun.spawnSync(["./" + TSC, ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const ms = performance.now() - t0;
  if (proc.exitCode !== 0) {
    throw new Error(`tsc failed in ${cwd} (exit ${proc.exitCode}): ${decode(proc.stderr).slice(0, 300) || decode(proc.stdout).slice(0, 300)}`);
  }
  return Math.round(ms);
}

const median = (values: readonly number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;

async function fiveTimedRuns(args: readonly string[], cwd: string): Promise<{ runsMs: number[]; medianMs: number }> {
  const runs: number[] = [];
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 1000)); // settle between runs
    runs.push(await timedRun(args, cwd));
  }
  return { runsMs: runs, medianMs: median(runs) };
}

function diagnostics(args: readonly string[], cwd: string): { fileCount: number; extended: string } {
  const list = spawnText([...args, "--listFilesOnly"], cwd);
  if (list.exitCode !== 0) throw new Error(`listFilesOnly failed in ${cwd}: ${list.stderr.slice(0, 300)}`);
  const fileCount = list.stdout.trim().split("\n").filter((l) => l.length > 0).length;
  const ext = spawnText([...args, "--extendedDiagnostics"], cwd);
  if (ext.exitCode !== 0) throw new Error(`extendedDiagnostics failed in ${cwd}: ${ext.stderr.slice(0, 300)}`);
  return { fileCount, extended: ext.stdout.trim() };
}

const pkgVersion = (cwd: string, name: string): string => {
  try {
    return (JSON.parse(readFileSync(join(cwd, "node_modules", name, "package.json"), "utf8")) as { version: string }).version;
  } catch {
    return "absent";
  }
};

const gitOf = (cwd: string): { commit: string; dirty: boolean } => {
  const run = (args: string[]): string => decode(Bun.spawnSync(["git", ...args], { cwd }).stdout).trim();
  return { commit: run(["rev-parse", "HEAD"]) || "unknown", dirty: run(["status", "--porcelain"]) !== "" };
};

const loadNow = (): string =>
  new TextDecoder().decode(Bun.spawnSync(["cat", "/proc/loadavg"]).stdout).trim();

// Interleaved cells (A,B,A,B,...): under sustained external load (the
// owner's ga-m6-soak-72h was running during measurement), alternation
// cancels load drift between cells; sequential cells would be order-biased.
const cell = (label: string, dir: string) => ({
  label,
  worktree: resolve(dir),
  fullRepo: { runsMs: [] as number[], medianMs: 0 },
  fixture: { runsMs: [] as number[], medianMs: 0 },
  loadSamples: [] as string[],
  fullRepoDiagnostics: null as null | ReturnType<typeof diagnostics>,
  fixtureDiagnostics: null as null | ReturnType<typeof diagnostics>,
});

const runInterleaved = async (
  a: { dir: string; cell: ReturnType<typeof cell> },
  b: { dir: string; cell: ReturnType<typeof cell> },
): Promise<void> => {
  const argsFor = (c: { cell: ReturnType<typeof cell> }) => [
    { key: "fullRepo" as const, argv: ["--noEmit"] as readonly string[] },
    { key: "fixture" as const, argv: [...FIXTURE_FLAGS] as readonly string[] },
  ];
  for (let round = 0; round < 5; round++) {
    for (const target of [a, b, a, b]) {
      await new Promise((r) => setTimeout(r, 750));
      for (const { key, argv } of argsFor(target)) {
        const ms = await timedRun([...argv], target.dir);
        target.cell[key].runsMs.push(ms);
        target.cell.loadSamples.push(loadNow());
      }
    }
    void round;
  }
  for (const target of [a, b]) {
    target.cell.fullRepo.medianMs = median(target.cell.fullRepo.runsMs);
    target.cell.fixture.medianMs = median(target.cell.fixture.runsMs);
    target.cell.fullRepoDiagnostics = diagnostics(["--noEmit"], target.dir);
    target.cell.fixtureDiagnostics = diagnostics([...FIXTURE_FLAGS], target.dir);
  }
};

const cpuModel = readFileSync("/proc/cpuinfo", "utf8").match(/model name\s*:\s*(.+)/)?.[1]?.trim() ?? "unknown";
const memoryTotalMb = Math.round(Number(readFileSync("/proc/meminfo", "utf8").match(/MemTotal:\s+(\d+) kB/)?.[1] ?? 0) / 1024);

const earlierCell = cell("earlier (v2 calibration source)", resolve(earlierDir));
const currentCell = cell("current (proposed v3 calibration source)", resolve(currentDir));
await runInterleaved(
  { dir: resolve(earlierDir), cell: earlierCell },
  { dir: resolve(currentDir), cell: currentCell },
);
const earlier = await earlierCell;
const current = await currentCell;

const environment = {
  measuredAt: new Date().toISOString(),
  host: `${homedir() === "/root" ? "root" : "user"}@${Bun.spawnSync(["uname", "-n"]).stdout ? decode(Bun.spawnSync(["uname", "-n"]).stdout).trim() : "unknown"}`,
  cpuModel,
  memoryTotalMb,
  bunVersion: Bun.version,
  loadAverageAtStart: loadNow(),
  externalLoadDisclosure: "The owner's ga-m6-soak-72h benchmark (started 2026-09-12 21:25 WIB, 72h duration) was running throughout this measurement; load averages of ~15-20 were recorded per run. Absolute medians are load-inflated relative to v2's quiet-host calibration; the INTERLEAVED design keeps the paired comparison valid under uniform external load. Quiet-host re-measurement is required before accepting any budget change.",
  perWorktree: {
    earlier: {
      ...gitOf(resolve(earlierDir)),
      tscExecutable: resolve(earlierDir, TSC),
      typescript: pkgVersion(resolve(earlierDir), "typescript"),
      atTypesBun: pkgVersion(resolve(earlierDir), "@types/bun"),
      zod: pkgVersion(resolve(earlierDir), "zod"),
    },
    current: {
      ...gitOf(resolve(currentDir)),
      tscExecutable: resolve(currentDir, TSC),
      typescript: pkgVersion(resolve(currentDir), "typescript"),
      atTypesBun: pkgVersion(resolve(currentDir), "@types/bun"),
      zod: pkgVersion(resolve(currentDir), "zod"),
    },
  },
  procedure:
    "Five timed runs per cell (1s settle between runs; 2s quiet before each cell), median reported. Diagnostics collected in separate runs (--extendedDiagnostics, --listFilesOnly). Full-repo runs use each revision's own tsconfig; the fixture is one identical file compiled with a pinned flag set mirroring the repo tsconfig minus DOM (--lib esnext --types bun), using only APIs present at both revisions.",
};

const report = { environment, earlier, current };
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  earlier: { fullMedianMs: earlier.fullRepo.medianMs, fixtureMedianMs: earlier.fixture.medianMs, files: earlier.fullRepoDiagnostics?.fileCount },
  current: { fullMedianMs: current.fullRepo.medianMs, fixtureMedianMs: current.fixture.medianMs, files: current.fullRepoDiagnostics?.fileCount },
}, null, 2));
console.log(`wrote ${outPath}`);
