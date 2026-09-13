/**
 * API-only vs API-plus-built-SPA comparison (owner-directed measurement).
 *
 * Harness contract (CA-14, after the #414 review):
 * - The timer is monotonic (performance.now) and starts BEFORE spawning the
 *   pinned Bun executable (process.execPath) directly against the built
 *   server entry — no `bun run` script-runner in between; proc.pid IS the
 *   server process whose RSS is sampled, and its REAL exit code is retained.
 * - "Readiness" stops the launch timer only after a successful /api/ready
 *   response: launch → imports → init → serving, all included.
 * - Workload requests must succeed (res.ok) and their bodies are consumed
 *   before the request counts as complete; the request phase is timed
 *   separately from the deliberate settling delay.
 * - The report binds to the actual tested artifacts by hash: installed
 *   tarball, server bundle, every frontend output, plus the source commit,
 *   clean/dirty state, and resolved dependency versions.
 *
 * Measurements to establish, not promised savings.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STARTER = join(import.meta.dir, "..");
const LUGAS_REPO = join(STARTER, "..", "..");
if (!existsSync(join(STARTER, "dist", "index.html")) || !existsSync(join(STARTER, "dist-server", "main.js"))) {
  console.error("run `bun run build` first");
  process.exit(1);
}
if (!existsSync("/proc/self/status")) {
  console.error("RSS sampling requires /proc (Linux)");
  process.exit(1);
}

const sha256 = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

const rssMiB = (pid: number): number => {
  const status = readFileSync(`/proc/${pid}/status`, "utf8");
  const kib = Number(/VmRSS:\s+(\d+)\s+kB/.exec(status)?.[1] ?? Number.NaN);
  return Number((kib / 1024).toFixed(1));
};

const depVersion = (name: string): string => {
  const pkgPath = join(STARTER, "node_modules", name, "package.json");
  if (!existsSync(pkgPath)) return "absent";
  return (JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string }).version ?? "unknown";
};

type Profile = "api-only" | "full";

async function measure(profile: Profile) {
  // t0 precedes the spawn: launch, imports, and initialization are all
  // inside the measured window (the #414 harness started after the
  // readiness line and under-measured).
  const t0 = performance.now();
  const proc = Bun.spawn([process.execPath, join("dist-server", "main.js")], {
    cwd: STARTER,
    env: { ...process.env, PORT: "0", STARTER_PROFILE: profile },
    stdout: "pipe",
    stdin: "ignore",
  });

  try {
    // Origin discovery from the readiness line (a sub-metric of its own);
    // the launch timer keeps running until /api/ready answers 200.
    const decoder = new TextDecoder();
    let buffer = "";
    let origin = "";
    const lineDeadline = Date.now() + 15_000;
    while (!origin) {
      if (Date.now() > lineDeadline) throw new Error(`${profile}: no readiness line within 15s`);
      const chunk = await proc.stdout.getReader().read().then((r) => (r.done ? "" : decoder.decode(r.value)));
      if (chunk === "") throw new Error(`${profile}: server exited before readiness line`);
      buffer += chunk;
      origin = /LUGAS_STARTER_READY (\S+)/.exec(buffer)?.[1] ?? "";
    }
    const readyLineMs = Math.round(performance.now() - t0);

    const readyDeadline = Date.now() + 15_000;
    for (;;) {
      const res = await fetch(`${origin}/api/ready`).catch(() => undefined);
      if (res) {
        if (res.ok) {
          await res.arrayBuffer(); // consume: the response is complete
          break;
        }
        await res.arrayBuffer();
      }
      if (Date.now() > readyDeadline) throw new Error(`${profile}: /api/ready never answered 200`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const readyMs = Math.round(performance.now() - t0);

    await new Promise((resolve) => setTimeout(resolve, 2_000)); // settle (recorded, not conflated)
    const idleRssMiB = rssMiB(proc.pid);

    // Workload: shell + deep navigation + every hashed asset, 40 rounds —
    // each request must succeed and be fully consumed to count. The shell
    // exists only in the full profile (api-only serves no frontend by
    // definition — the #414 harness silently accepted its 404 here).
    let assetUrls: string[] = [];
    if (profile === "full") {
      const shell = await fetch(`${origin}/`).then(async (r) => {
        if (!r.ok) throw new Error(`${profile}: shell request failed`);
        return r.text();
      });
      assetUrls = [...shell.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]!);
    }
    const deepOrApi = profile === "full" ? `${origin}/app/projects/42` : `${origin}/api/hello`;
    let requests = 0;
    const w0 = performance.now();
    for (let i = 0; i < 40; i++) {
      for (const url of assetUrls) {
        const res = await fetch(`${origin}${url}`);
        if (!res.ok) throw new Error(`${profile}: asset request failed: ${url}`);
        await res.arrayBuffer();
        requests += 1;
      }
      const res = await fetch(deepOrApi);
      if (!res.ok) throw new Error(`${profile}: navigation/api request failed`);
      await res.arrayBuffer();
      requests += 1;
    }
    const requestPhaseMs = Math.round(performance.now() - w0);

    await new Promise((resolve) => setTimeout(resolve, 2_000)); // settle (recorded, not conflated)
    const afterWorkloadRssMiB = rssMiB(proc.pid);

    proc.kill("SIGTERM");
    const exitCode = await proc.exited; // the server process's real exit result

    return {
      profile,
      readyLineMs,
      readyMs,
      idleRssMiB,
      afterWorkloadRssMiB,
      requests,
      requestPhaseMs,
      settleDelayMs: 2_000,
      assetCount: assetUrls.length,
      exitCode,
    };
  } finally {
    // Failure paths must not leak the child.
    proc.kill("SIGTERM");
    await proc.exited.catch(() => undefined);
  }
}

// Artifact identity: what was ACTUALLY tested (hashes, commit, dirt, deps).
const frontendOutputs: Record<string, string> = {};
const distAssets = join(STARTER, "dist", "assets");
for (const file of existsSync(distAssets) ? readdirSync(distAssets).sort() : []) {
  frontendOutputs[file] = sha256(join(distAssets, file)).slice(0, 16);
}
const gitRun = (args: string[]): string =>
  new TextDecoder().decode(Bun.spawnSync(["git", ...args], { cwd: LUGAS_REPO }).stdout).trim();

const identity = {
  bunVersion: Bun.version,
  bunExecutable: process.execPath,
  lugasCheckoutCommit: gitRun(["rev-parse", "HEAD"]) || "unknown",
  lugasCheckoutDirty: gitRun(["status", "--porcelain"]) !== "",
  installedLugas: {
    tarballSha256: sha256(join(STARTER, "lugas-starter.tgz")),
    packageVersion: depVersion("lugas"),
  },
  serverBundleSha256: sha256(join(STARTER, "dist-server", "main.js")).slice(0, 16),
  frontendOutputs,
  resolvedDependencies: {
    react: depVersion("react"),
    "react-dom": depVersion("react-dom"),
    vite: depVersion("vite"),
    zod: depVersion("zod"),
    typescript: depVersion("typescript"),
  },
};

const apiOnly = await measure("api-only");
const full = await measure("full");

const report = {
  measuredAt: new Date().toISOString(),
  harness: "CA-14 repaired: direct spawn of the pinned Bun executable, monotonic launch timer closed on a successful readiness response, server-process RSS sampling, real exit code retained, workload requests verified and consumed, request phase timed separately from settling",
  identity,
  profiles: { "api-only": apiOnly, "api+spa": full },
  note: "Measurements to establish, not promised savings. RSS figures are the server process's resident footprint on this machine/run — not a guarantee; framework queue/memory claims live in ADR-0036/ADR-0037, not here.",
};

const outDir = join(STARTER, "measurements");
mkdirSync(outDir, { recursive: true });
const stamp = report.measuredAt.slice(0, 19).replaceAll(":", "");
const out = join(outDir, `${stamp}-api-vs-spa-v2.json`);
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
console.log(`\nwrote ${out}`);
