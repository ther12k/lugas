/**
 * API-only vs API-plus-built-SPA comparison (owner-directed measurement):
 * process launch to genuine readiness, idle RSS, and RSS after an
 * asset-request workload — for the SAME server code with
 * STARTER_PROFILE=api-only (no assets/spa) versus the full app.
 *
 * Measurement identity (owner review of #414 — the v1 harness produced
 * non-comparable numbers and its artifact is superseded):
 * - A monotonic timer starts BEFORE spawning the pinned Bun executable
 *   (process.execPath) on the built server entry — launch, imports, and
 *   initialization are inside the measurement, and the timer stops only
 *   after /api/ready answers 200 (genuine readiness, not a startup line).
 * - The server is spawned DIRECTLY, never via `bun run`: the script runner
 *   is a separate process, so the v1 harness sampled and signalled the
 *   runner's PID, not the server's. proc.pid here IS the server.
 * - The child's real exit code is retained (v1 collapsed every outcome of
 *   proc.exited to "0").
 * - Timeouts and failures kill the child and wait for it — a failed
 *   measurement never leaks a server process.
 * - Workload requests only count when the response is ok AND its body has
 *   been consumed; request time is recorded separately from the deliberate
 *   settle delays (v1 folded the settle into workloadMs).
 *
 * Every sample is bound to the artifacts that produced it by SHA-256: the
 * installed lugas tarball, the resolved installed package, the server
 * bundle, and the built frontend — plus the producer checkout's HEAD and
 * dirty-file count (setup packs the working tree, which may exceed HEAD).
 *
 * Measurements to establish, not promised savings. RSS is read from
 * /proc/<pid>/status (Linux); other platforms skip.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { loadavg } from "node:os";
import { join } from "node:path";

const STARTER = join(import.meta.dir, "..");
const REPO = join(STARTER, "..", "..");
if (!existsSync(join(STARTER, "dist", "index.html")) || !existsSync(join(STARTER, "dist-server", "main.js"))) {
  console.error("run `bun run build` first");
  process.exit(1);
}
if (!existsSync("/proc/self/status")) {
  console.error("RSS sampling requires /proc (Linux)");
  process.exit(1);
}

const SETTLE_MS = 2_000;
const READY_DEADLINE_MS = 15_000;
const API_READY_DEADLINE_MS = 10_000;

const rssKiB = (pid: number): number => {
  const status = readFileSync(`/proc/${pid}/status`, "utf8");
  return Number(/VmRSS:\s+(\d+)\s+kB/.exec(status)?.[1] ?? Number.NaN);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Profile = "api-only" | "full";

type ServerProc = Bun.Subprocess<"ignore", "pipe", "inherit">;

async function readReadyOrigin(proc: ServerProc, profile: Profile): Promise<string> {
  const decoder = new TextDecoder();
  const deadline = Date.now() + READY_DEADLINE_MS;
  let buffer = "";
  for (;;) {
    if (Date.now() > deadline) throw new Error(`${profile}: no readiness line within ${READY_DEADLINE_MS}ms`);
    const chunk = await proc.stdout.getReader().read().then((r) => (r.done ? "" : decoder.decode(r.value)));
    if (chunk === "") throw new Error(`${profile}: server exited before readiness (exit ${await proc.exited})`);
    buffer += chunk;
    const match = /LUGAS_STARTER_READY (\S+)/.exec(buffer);
    if (match) return match[1]!;
  }
}

/** Resolves on the first 200 from /api/ready — genuine readiness. */
async function awaitApiReady(origin: string, profile: Profile): Promise<void> {
  const deadline = Date.now() + API_READY_DEADLINE_MS;
  for (;;) {
    const res = await fetch(`${origin}/api/ready`).catch(() => undefined);
    if (res?.status === 200) return;
    if (Date.now() > deadline) throw new Error(`${profile}: /api/ready never answered 200 within ${API_READY_DEADLINE_MS}ms`);
    await sleep(5);
  }
}

/** One request, counted only when ok AND its body is fully consumed. */
async function completedFetch(url: string, label: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${label} answered ${res.status}`);
  await res.arrayBuffer();
}

async function measure(profile: Profile): Promise<Record<string, unknown>> {
  // Monotonic clock, started BEFORE the spawn: everything from process
  // launch to genuine readiness is inside the measurement.
  const t0 = performance.now();
  const proc = Bun.spawn([process.execPath, "dist-server/main.js"], {
    cwd: STARTER,
    env: { ...process.env, PORT: "0", STARTER_PROFILE: profile },
    stdout: "pipe",
    stdin: "ignore",
  });
  try {
    const origin = await readReadyOrigin(proc, profile);
    await awaitApiReady(origin, profile);
    const launchToReadyMs = Math.round(performance.now() - t0);

    await sleep(SETTLE_MS); // deliberate idle settle before the RSS sample
    const idleRssKiB = rssKiB(proc.pid);

    // Asset-request workload: shell, deep navigation, and every hashed asset
    // referenced by the shell — api-only (no assets/spa by profile) drives
    // the same request count against /api/hello. workloadMs covers requests
    // only; the settle after it is recorded separately.
    let assetUrls: string[] = [];
    if (profile === "full") {
      const shellRes = await fetch(`${origin}/`);
      if (!shellRes.ok) throw new Error(`${profile}: shell answered ${shellRes.status}`);
      const shell = await shellRes.text();
      assetUrls = [...shell.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]!);
    }
    let completedRequests = 0;
    const workloadStart = performance.now();
    for (let i = 0; i < 40; i++) {
      for (const url of assetUrls) {
        await completedFetch(`${origin}${url}`, `${profile} asset ${url}`);
        completedRequests++;
      }
      await completedFetch(profile === "full" ? `${origin}/app/projects/42` : `${origin}/api/hello`, `${profile} navigation`);
      completedRequests++;
    }
    const workloadMs = Math.round(performance.now() - workloadStart);

    await sleep(SETTLE_MS); // deliberate drain settle before the RSS sample
    const afterWorkloadRssKiB = rssKiB(proc.pid);

    proc.kill("SIGTERM");
    const shutdownExit = await proc.exited; // real exit code, retained as a number
    return {
      profile,
      launchToReadyMs,
      idleRssMiB: Number((idleRssKiB / 1024).toFixed(1)),
      afterWorkloadRssMiB: Number((afterWorkloadRssKiB / 1024).toFixed(1)),
      assetRequests: completedRequests,
      workloadMs,
      workloadSettleMs: SETTLE_MS,
      assetCount: assetUrls.length,
      shutdownExit,
    };
  } catch (e) {
    // A failed measurement must not leak the server process.
    proc.kill("SIGKILL");
    await proc.exited.catch(() => undefined);
    throw e;
  }
}

/** SHA-256 of a file, hex. */
const sha256File = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

const sha256DirFiles = (dir: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const file of existsSync(dir) ? readdirSync(dir) : []) {
    const full = join(dir, file);
    out[file] = statSync(full).isFile() ? sha256File(full) : "(directory)";
  }
  return out;
};

function gitState(cwd: string): { head: string; dirtyFiles: number } {
  const head = new TextDecoder().decode(Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd }).stdout).trim();
  const status = new TextDecoder().decode(Bun.spawnSync(["git", "status", "--porcelain"], { cwd }).stdout).trim();
  return { head: head || "unknown", dirtyFiles: status === "" ? 0 : status.split("\n").length };
}

// Artifact identity: everything the measured server actually ran, hashed.
const installedPkg = JSON.parse(readFileSync(join(STARTER, "node_modules", "lugas", "package.json"), "utf8")) as { name: string; version: string };
const artifactIdentity = {
  installedTarball: { file: "lugas-starter.tgz", sha256: sha256File(join(STARTER, "lugas-starter.tgz")) },
  installedPackage: { name: installedPkg.name, version: installedPkg.version, resolvedFrom: "file:lugas-starter.tgz" },
  serverBundle: sha256DirFiles(join(STARTER, "dist-server")),
  frontend: {
    indexHtml: sha256File(join(STARTER, "dist", "index.html")),
    assets: sha256DirFiles(join(STARTER, "dist", "assets")),
  },
  producerRepo: gitState(REPO),
};

const loadBefore = loadavg();
const apiOnly = await measure("api-only");
const full = await measure("full");
const loadAfter = loadavg();

const report = {
  format: "lugas-starter-measurement-v2",
  measuredAt: new Date().toISOString(),
  bun: Bun.version,
  bunExecutable: process.execPath,
  hostLoadAverage: { before: loadBefore.map((x) => Number(x.toFixed(2))), after: loadAfter.map((x) => Number(x.toFixed(2))) },
  artifactIdentity,
  profiles: { "api-only": apiOnly, "api+spa": full },
  note: "Measurements to establish, not promised savings. launchToReadyMs spans process spawn (pinned Bun executable, built server entry, direct child) to the first 200 from /api/ready. RSS bounds are the measured server process's resident footprint on this machine/run, not a guarantee; the queue/memory claims live in ADR-0036/ADR-0037, not here.",
};

const outDir = join(STARTER, "measurements");
mkdirSync(outDir, { recursive: true });
const stamp = report.measuredAt.slice(0, 10);
let out = join(outDir, `${stamp}-api-vs-spa.json`);
for (let n = 2; existsSync(out); n++) out = join(outDir, `${stamp}-api-vs-spa-v${n}.json`);
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
console.log(`\nwrote ${out}`);
