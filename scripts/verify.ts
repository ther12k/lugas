#!/usr/bin/env bun

type CheckResult = { name: string; status: "PASS" | "FAIL" | "SKIP"; output: string };

const checks = [
  ["typecheck", ["bunx", "tsc", "--noEmit"]],
  ["test", ["bun", "test"]],
] as const;

function help(): void {
  console.log(`Usage: bun run verify [--help]

Runs named checks:
  typecheck  bunx tsc --noEmit
  test       bun test
  docs       bun run scripts/verify-okf.ts (skipped until M0-005)
  diff       git diff --check`);
}

async function run(name: string, command: readonly string[]): Promise<CheckResult> {
  const proc = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const exit = await proc.exited;
  const output = `${stdout}${stderr}`.trim();
  return { name, status: exit === 0 ? "PASS" : "FAIL", output };
}

async function main(): Promise<number> {
  if (Bun.argv.includes("--help")) { help(); return 0; }
  const results: CheckResult[] = [];
  for (const [name, command] of checks) {
    console.log(`== ${name} ==`);
    const result = await run(name, command);
    results.push(result);
    console.log(`${result.status}: ${result.output || "(no output)"}`);
  }
  const docsPath = `${import.meta.dir}/verify-okf.ts`;
  if (await Bun.file(docsPath).exists()) {
    const result = await run("docs", ["bun", "run", docsPath]);
    results.push(result);
    console.log(`== docs ==\n${result.status}: ${result.output || "(no output)"}`);
  } else {
    const result = { name: "docs", status: "SKIP" as const, output: "scripts/verify-okf.ts not present — introduced by M0-005" };
    results.push(result);
    console.log(`== docs ==\nSKIP: ${result.output}`);
  }
  const diff = await run("diff", ["git", "diff", "--check"]);
  results.push(diff);
  console.log(`== diff ==\n${diff.status}: ${diff.output || "(no output)"}`);
  return results.some((result) => result.status === "FAIL") ? 1 : 0;
}

process.exit(await main());
