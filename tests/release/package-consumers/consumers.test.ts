/**
 * Beta package-consumer proof (M6-003 / M6R1-006).
 *
 * Runs the same consumer checks as `bun run release:package:rehearse`
 * against the staged tarball, but as a regular test file so regressions
 * surface in the normal verify gate. Heavy lifting (packing, installing,
 * artifact emission) stays in the rehearsal script; this suite exercises
 * each consumer path through a freshly packed tarball to keep parity.
 *
 * Skips cleanly when npm is unavailable (documented, not silently passed).
 */
import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const BETA_VERSION = "0.1.0-beta.1";

interface Staged {
  stage: string;
  tgzPath: string;
}

function stageTarball(): Staged | null {
  const probe = Bun.spawnSync(["npm", "--version"], { stdout: "pipe", stderr: "pipe" });
  if (probe.exitCode !== 0) return null;

  const stage = mkdtempSync(join(tmpdir(), "lugas-beta-test-"));
  const stagePkg = join(stage, "package");
  mkdirSync(stagePkg, { recursive: true });
  cpSync(ROOT, stagePkg, {
    recursive: true,
    filter: (src) => {
      const rel = src.slice(ROOT.length);
      if (!rel || rel === "/") return true;
      return (
        !rel.includes("/node_modules/") && !rel.endsWith("/node_modules") &&
        !rel.includes("/.worktrees/") && !rel.endsWith("/.worktrees") &&
        !rel.includes("/.git/") && !rel.endsWith("/.git") &&
        !rel.startsWith("/benchmarks/results/") &&
        !rel.startsWith("/docs/releases/")
      );
    },
  });
  const pkgPath = join(stagePkg, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    version: string;
    private?: boolean;
    scripts: Record<string, string>;
  } & Record<string, unknown>;
  // Mirror the canonical rehearsal staging transformation (#278/#283):
  // candidate version, shippable metadata, and the CLI bin mapping.
  pkg.version = BETA_VERSION;
  delete pkg.scripts["release:package:rehearse"];
  delete pkg.private;
  pkg.publishConfig = { access: "public" };
  pkg.bin = { lugas: "./src/cli/main.ts" };
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  try {
    const out = execSync("npm pack --json", { cwd: stagePkg, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const parsed = JSON.parse(out) as Array<{ filename: string }>;
    return { stage, tgzPath: join(stagePkg, parsed[0]!.filename) };
  } catch {
    rmSync(stage, { recursive: true, force: true });
    return null;
  }
}

function installConsumer(stage: string, name: string, tgzPath: string): string {
  const dir = join(stage, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name, private: true }, null, 2),
  );
  execSync(`bun install --no-save ${tgzPath}`, { cwd: dir, stdio: "pipe" });
  return dir;
}

function npmAvailable(): boolean {
  const probe = Bun.spawnSync(["npm", "--version"], { stdout: "pipe", stderr: "pipe" });
  return probe.exitCode === 0 && new TextDecoder().decode(probe.stdout).trim() !== "";
}

describe.skipIf(!npmAvailable())("beta package consumers (M6R1-006)", () => {
  test("npm pack produces a valid tarball for consumers", () => {
    const stagedLocal = stageTarball();
    expect(stagedLocal).not.toBeNull();
    if (!stagedLocal) return;
    expect(existsSync(stagedLocal.tgzPath)).toBe(true);
    rmSync(stagedLocal.stage, { recursive: true, force: true });
  });

  test("server consumer runs an app from the packed beta tarball", () => {
    const staged2 = stageTarball();
    if (!staged2) throw new Error("stage failed");
    const { stage, tgzPath } = staged2;
    try {
      const dir = installConsumer(stage, "t-server", tgzPath);
      writeFileSync(
        join(dir, "app.ts"),
        `import { defineApp, route, json } from "lugas";
const app = defineApp({ routes: { "/ping": { GET: route({ handler: () => json(200, { pong: true }) }) } } });
console.log("OK format=" + app.manifest.format);`,
      );
      const proc = Bun.spawnSync([process.execPath, "run", "app.ts"], { cwd: dir, stdout: "pipe", stderr: "pipe" });
      const stdout = new TextDecoder().decode(proc.stdout).trim();
      expect(proc.exitCode).toBe(0);
      expect(stdout).toContain("OK format=lugas-manifest-v1");
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  });

  test("client consumer bundles and runs in Node from the packed beta tarball", async () => {
    const staged2 = stageTarball();
    if (!staged2) throw new Error("stage failed");
    const { stage, tgzPath } = staged2;
    try {
      const dir = installConsumer(stage, "t-client", tgzPath);
      writeFileSync(
        join(dir, "entry.ts"),
        `import { createClient } from "lugas/client";
const c = createClient({ baseUrl: "https://x.test" });
if (typeof c.get !== "function") throw new Error("bad client");`,
      );
      const outDir = join(dir, "dist");
      const bundle = await Bun.build({ entrypoints: [join(dir, "entry.ts")], target: "browser", outdir: outDir });
      expect(bundle.success).toBe(true);
      const js = readdirSync(outDir).find((f) => f.endsWith(".js"));
      expect(js).toBeDefined();
      const smoke = Bun.spawnSync(["node", "-e", `globalThis.fetch=async()=>new Response('{}');import('./dist/${js}').then(()=>console.log('NODE-RUN-OK')).catch(e=>{console.error(e);process.exit(1)})`], { cwd: dir, stdout: "pipe", stderr: "pipe" });
      expect(new TextDecoder().decode(smoke.stdout).trim()).toBe("NODE-RUN-OK");
      expect(smoke.exitCode).toBe(0);
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  });

  test("testing consumer round-trips createTestServer from the packed beta tarball", () => {
    const staged2 = stageTarball();
    if (!staged2) throw new Error("stage failed");
    const { stage, tgzPath } = staged2;
    try {
      const dir = installConsumer(stage, "t-testing", tgzPath);
      writeFileSync(
        join(dir, "probe.ts"),
        `import { createTestServer } from "lugas/testing";
import { defineApp, route, json } from "lugas";
const app = defineApp({ routes: { "/hi": { GET: route({ handler: () => json(200, { hello: "world" }) }) } } });
const server = createTestServer(app, { port: 0 });
const res = await server.fetch("/hi");
const body = (await res.json()) as { hello: string };
if (res.status !== 200 || body.hello !== "world") throw new Error("mismatch");
await server.stop();
console.log("TESTING-OK");`,
      );
      const proc = Bun.spawnSync([process.execPath, "run", "probe.ts"], { cwd: dir, stdout: "pipe", stderr: "pipe" });
      expect(proc.exitCode).toBe(0);
      expect(new TextDecoder().decode(proc.stdout).trim()).toBe("TESTING-OK");
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  });

  test("packed export map exposes only root, client, and testing subpaths", () => {
    const staged2 = stageTarball();
    if (!staged2) throw new Error("stage failed");
    const { stage, tgzPath } = staged2;
    try {
      const dir = installConsumer(stage, "t-freeze", tgzPath);
      const installedExports = JSON.parse(readFileSync(join(dir, "node_modules/lugas/package.json"), "utf8")) as { exports: Record<string, unknown>; version: string };
      expect(installedExports.version).toBe(BETA_VERSION);
      expect(Object.keys(installedExports.exports).sort()).toEqual([".", "./client", "./testing"]);
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  });

  test("CLI executes a real route inspection through the installed bin link", () => {
    const stagedLocal = stageTarball();
    if (!stagedLocal) throw new Error("stage failed");
    const dir = installConsumer(stagedLocal.stage, "t-cli", stagedLocal.tgzPath);
    try {
      writeFileSync(
        join(dir, "fixture-app.ts"),
        `import { defineApp, route, text } from "lugas";
export default defineApp({ routes: { "/x": { GET: route({ handler: () => text(200, "ok") }) } } });`,
      );
      const bin = join(dir, "node_modules", ".bin", "lugas");
      expect(existsSync(bin)).toBe(true);
      const proc = Bun.spawnSync([process.execPath, bin, "routes", join(dir, "fixture-app.ts")], {
        cwd: dir, stdout: "pipe", stderr: "pipe",
      });
      const stdout = new TextDecoder().decode(proc.stdout);
      expect(proc.exitCode).toBe(0);
      expect(stdout).toContain("lugas-manifest");
      expect(stdout).toContain("/x");
    } finally {
      rmSync(stagedLocal.stage, { recursive: true, force: true });
    }
  });
});
