/**
 * CLI safe-import probe (M4-010).
 *
 * Spawns a fresh Bun subprocess per fixture, dynamically imports it, and
 * observes: does the import resolve? Does a server start? Does the process
 * hang?
 *
 * Usage: bun run spikes/cli-import/probe.ts
 */
import { spawn, spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");
const ROOT = resolve(import.meta.dir, "../..");
const TIMEOUT_MS = 5_000;

type ProbeResult = {
  fixture: string;
  outcome: "clean-exit" | "import-error" | "timeout-hang" | "server-started";
  exitCode: number | null;
  stderr: string;
  durationMs: number;
};

async function probeFile(filePath: string): Promise<ProbeResult> {
  const start = Date.now();
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, ["run", filePath], {
      cwd: ROOT,
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    if (child.stdout) {
      child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    }
    if (child.stderr) {
      child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    }

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      const outcome = killed
        ? (stdout.includes("started") ? ("server-started" as const) : ("timeout-hang" as const))
        : code !== 0 ? ("import-error" as const) : ("clean-exit" as const);
      resolvePromise({
        fixture: filePath.split("/").pop() ?? "",
        outcome,
        exitCode: code,
        stderr,
        durationMs,
      });
    });
  });
}

const fixtures = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".ts")).sort();
console.log(`Probing ${fixtures.length} fixtures...\n`);

const results: ProbeResult[] = [];
for (const file of fixtures) {
  const result = await probeFile(join(FIXTURES_DIR, file));
  results.push(result);
}

console.log("| fixture | outcome | duration |");
console.log("|---|---|---|");
for (const r of results) {
  console.log(`| ${r.fixture} | ${r.outcome} | ${r.durationMs}ms |`);
}
