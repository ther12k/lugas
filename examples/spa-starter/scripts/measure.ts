/**
 * API-only vs API-plus-built-SPA comparison (owner-directed measurement):
 * process launch to genuine readiness, idle RSS, and RSS after an
 * asset-request workload — for the SAME server code with
 * STARTER_PROFILE=api-only (no assets/spa) versus the full app.
 *
 * Measurements to establish, not promised savings. Pinned in the output:
 * bun version, lugas source commit, frontend build artifact hashes.
 * RSS is read from /proc/<pid>/status (Linux); other platforms skip.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STARTER = join(import.meta.dir, "..");
if (!existsSync(join(STARTER, "dist", "index.html")) || !existsSync(join(STARTER, "dist-server", "main.js"))) {
  console.error("run `bun run build` first");
  process.exit(1);
}
if (!existsSync("/proc/self/status")) {
  console.error("RSS sampling requires /proc (Linux)");
  process.exit(1);
}

const rssKiB = (pid: number): number => {
  const status = readFileSync(`/proc/${pid}/status`, "utf8");
  return Number(/VmRSS:\s+(\d+)\s+kB/.exec(status)?.[1] ?? Number.NaN);
};

type Profile = "api-only" | "full";

async function measure(profile: Profile): Promise<string> {
  const proc = Bun.spawn(["bun", "run", "start:built"], {
    cwd: STARTER,
    env: { ...process.env, PORT: "0", STARTER_PROFILE: profile },
    stdout: "pipe",
    stdin: "ignore",
  });
  const decoder = new TextDecoder();
  const origin = await (async () => {
    const deadline = Date.now() + 15_000;
    let buffer = "";
    for (;;) {
      if (Date.now() > deadline) throw new Error(`${profile}: no readiness line within 15s`);
      const chunk = await proc.stdout.getReader().read().then((r) => (r.done ? "" : decoder.decode(r.value)));
      if (chunk === "") throw new Error(`${profile}: server exited early`);
      buffer += chunk;
      const match = /LUGAS_STARTER_READY (\S+)/.exec(buffer);
      if (match) return match[1]!;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  })();

  // Launch-to-genuine-readiness: the API answers.
  const launched = Date.now();
  for (;;) {
    const res = await fetch(`${origin}/api/ready`).catch(() => undefined);
    if (res?.status === 200) break;
    if (Date.now() - launched > 10_000) throw new Error(`${profile}: /api/ready never answered`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const readyMs = Date.now() - launched;

  await new Promise((resolve) => setTimeout(resolve, 2_000)); // settle
  const idleRssKiB = rssKiB(proc.pid);

  // Asset-request workload: shell, deep navigation, and every hashed asset —
  // 200 requests (api-only does the same count against /api/hello).
  const shell = await fetch(`${origin}/`).then((r) => r.text());
  const assetUrls = [...shell.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]!);
  const workloadStart = Date.now();
  for (let i = 0; i < 40; i++) {
    for (const url of assetUrls) await fetch(`${origin}${url}`);
    await fetch(profile === "full" ? `${origin}/app/projects/42` : `${origin}/api/hello`);
  }
  await new Promise((resolve) => setTimeout(resolve, 2_000)); // let the event loop drain
  const afterWorkloadRssKiB = rssKiB(proc.pid);

  proc.kill("SIGTERM");
  const exit = await proc.exited.then(() => "0", () => "killed");
  return JSON.stringify({
    profile,
    readyMs,
    idleRssMiB: Number((idleRssKiB / 1024).toFixed(1)),
    afterWorkloadRssMiB: Number((afterWorkloadRssKiB / 1024).toFixed(1)),
    assetRequests: assetUrls.length * 40,
    workloadMs: Date.now() - workloadStart,
    assetCount: assetUrls.length,
    shutdownExit: exit,
  }, null, 2);
}

const artifactHashes: Record<string, string> = {};
const distAssets = join(STARTER, "dist", "assets");
for (const file of existsSync(distAssets) ? readdirSync(distAssets) : []) {
  artifactHashes[file] = createHash("sha256").update(readFileSync(join(distAssets, file))).digest("hex").slice(0, 16);
}

const apiOnly = JSON.parse(await measure("api-only"));
const full = JSON.parse(await measure("full"));

const report = {
  measuredAt: new Date().toISOString(),
  bun: Bun.version,
  lugasSource: new TextDecoder().decode(Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: STARTER }).stdout).trim() || "unknown",
  frontendArtifacts: artifactHashes,
  profiles: { "api-only": apiOnly, "api+spa": full },
  note: "Measurements to establish, not promised savings. RSS bounds are process-resident footprint on this machine/run, not a guarantee; the queue/memory claims live in ADR-0036/ADR-0037, not here.",
};

const outDir = join(STARTER, "measurements");
mkdirSync(outDir, { recursive: true });
const stamp = report.measuredAt.slice(0, 10);
const out = join(outDir, `${stamp}-api-vs-spa.json`);
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
console.log(`\nwrote ${out}`);
