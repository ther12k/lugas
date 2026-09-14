/**
 * Dual-distribution resolution proof (CA-20).
 *
 * The export map exposes raw TypeScript under the "bun" condition (default
 * on Bun), emitted JavaScript under the explicit "lugas-dist" condition,
 * and dist as the fallback for tools that do not select Bun's condition.
 * This suite packs the staged package (src + dist + build, version-stamped
 * the same way the rehearsal does), installs the tarball into a consumer,
 * and pins: per-mode resolution, per-mode runtime execution with one
 * version identity, subpath policy, the browser artifact, and tarball
 * contents. Skips cleanly when npm is unavailable.
 */
import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CANDIDATE_VERSION } from "../../../scripts/release/candidate-version";

const ROOT = resolve(import.meta.dir, "../../..");

interface Staged {
  stage: string;
  tgzPath: string;
  entries: string[];
}

async function stageTarball(): Promise<Staged | null> {
  const probe = Bun.spawnSync(["npm", "--version"], { stdout: "pipe", stderr: "pipe" });
  if (probe.exitCode !== 0) return null;

  const stage = mkdtempSync(join(tmpdir(), "lugas-dualdist-"));
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
    private?: string | boolean;
    scripts: Record<string, string>;
  } & Record<string, unknown>;
  pkg.version = CANDIDATE_VERSION;
  delete pkg.scripts["release:package:rehearse"];
  delete pkg.private;
  pkg.publishConfig = { access: "public" };
  pkg.bin = { lugas: "./dist/cli/main.js" };
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const { buildDist } = await import("../../../scripts/release/build-dist");
  await buildDist({ sourceRoot: stagePkg, version: CANDIDATE_VERSION });
  const { buildBrowserClient } = await import("../../../scripts/release/build-browser-client");
  await buildBrowserClient(join(stagePkg, "build"), stagePkg);

  try {
    const out = execSync("npm pack --json", { cwd: stagePkg, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const parsed = JSON.parse(out) as Array<{ filename: string }>;
    const listing = execSync("tar -tzf " + parsed[0]!.filename, { cwd: stagePkg, encoding: "utf8" });
    return { stage, tgzPath: join(stagePkg, parsed[0]!.filename), entries: listing.split("\n") };
  } catch {
    rmSync(stage, { recursive: true, force: true });
    return null;
  }
}

function installConsumer(stage: string, name: string, tgzPath: string): string {
  const dir = join(stage, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name, private: true }, null, 2));
  execSync(`bun install --no-save ${tgzPath}`, { cwd: dir, stdio: "pipe" });
  return dir;
}

function run(cmd: string, cwd: string): { code: number; out: string } {
  const proc = Bun.spawnSync(["bash", "-c", cmd], { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    code: proc.exitCode,
    out: `${new TextDecoder().decode(proc.stdout).trim()}\n${new TextDecoder().decode(proc.stderr).trim()}`.trim(),
  };
}

describe.skipIf(!existsSync(join(ROOT, "node_modules")))("dual distribution (CA-20)", () => {
  test("staged pack ships both representations with one stamped version", async () => {
    const staged = await stageTarball();
    if (!staged) throw new Error("stage failed (npm unavailable?)");
    try {
      expect(staged.entries).toContain("package/src/index.ts");
      expect(staged.entries).toContain("package/dist/index.js");
      expect(staged.entries).toContain("package/build/lugas-client.esm.js");
      const dir = installConsumer(staged.stage, "t-contents", staged.tgzPath);
      const srcStamp = readFileSync(
        join(dir, "node_modules", "lugas", "src", "internal", "framework-version.ts"),
        "utf8",
      );
      expect(srcStamp).toContain(`FRAMEWORK_VERSION = ${JSON.stringify(CANDIDATE_VERSION)}`);
      const distStamp = readFileSync(
        join(dir, "node_modules", "lugas", "dist", "internal", "framework-version.js"),
        "utf8",
      );
      expect(distStamp).toContain(`FRAMEWORK_VERSION = ${JSON.stringify(CANDIDATE_VERSION)}`);
    } finally {
      rmSync(staged.stage, { recursive: true, force: true });
    }
  }, 240_000);

  test("default Bun execution resolves and runs the raw TypeScript tree", async () => {
    const staged = await stageTarball();
    if (!staged) throw new Error("stage failed (npm unavailable?)");
    try {
      const dir = installConsumer(staged.stage, "t-default", staged.tgzPath);
      const resolved = run('bun -e \'console.log(Bun.resolveSync("lugas", process.cwd()))\'', dir);
      expect(resolved.code).toBe(0);
      expect(resolved.out.endsWith("src/index.ts")).toBe(true);
      writeFileSync(
        join(dir, "app.ts"),
        `import { defineApp, route, json } from "lugas";
const app = defineApp({ routes: { "/ping": { GET: route({ handler: () => json(200, { pong: true }) } ) } } });
console.log("RAW-OK fw=" + app.manifest.frameworkVersion);`,
      );
      const ran = run("bun run app.ts", dir);
      expect(ran.code).toBe(0);
      expect(ran.out).toContain(`RAW-OK fw=${CANDIDATE_VERSION}`);
    } finally {
      rmSync(staged.stage, { recursive: true, force: true });
    }
  }, 240_000);

  test("--conditions=lugas-dist resolves and runs the emitted dist tree with the same identity", async () => {
    const staged = await stageTarball();
    if (!staged) throw new Error("stage failed (npm unavailable?)");
    try {
      const dir = installConsumer(staged.stage, "t-dist", staged.tgzPath);
      const resolved = run(
        'bun --conditions=lugas-dist -e \'console.log(Bun.resolveSync("lugas", process.cwd()))\'',
        dir,
      );
      expect(resolved.code).toBe(0);
      expect(resolved.out.endsWith("dist/index.js")).toBe(true);
      writeFileSync(
        join(dir, "app.ts"),
        `import { defineApp, route, json } from "lugas";
const app = defineApp({ routes: { "/ping": { GET: route({ handler: () => json(200, { pong: true }) } ) } } });
console.log("DIST-OK fw=" + app.manifest.frameworkVersion);`,
      );
      const ran = run("bun --conditions=lugas-dist run app.ts", dir);
      expect(ran.code).toBe(0);
      expect(ran.out).toContain(`DIST-OK fw=${CANDIDATE_VERSION}`);
    } finally {
      rmSync(staged.stage, { recursive: true, force: true });
    }
  }, 240_000);

  test("subpaths honor the same policy; non-Bun tooling falls back to dist", async () => {
    const staged = await stageTarball();
    if (!staged) throw new Error("stage failed (npm unavailable?)");
    try {
      const dir = installConsumer(staged.stage, "t-subpath", staged.tgzPath);
      const clientDefault = run(
        'bun -e \'console.log(Bun.resolveSync("lugas/client", process.cwd()))\'',
        dir,
      );
      expect(clientDefault.out.endsWith("src/client/index.ts")).toBe(true);
      const clientDist = run(
        'bun --conditions=lugas-dist -e \'console.log(Bun.resolveSync("lugas/client", process.cwd()))\'',
        dir,
      );
      expect(clientDist.out.endsWith("dist/client/index.js")).toBe(true);
      // Node does not implement the "bun" condition: require.resolve must
      // select the dist fallback (tooling compatibility, not Node runtime
      // support — the server core remains Bun-only).
      const nodeResolved = run('node -e "console.log(require.resolve(\'lugas\'))"', dir);
      expect(nodeResolved.code).toBe(0);
      expect(nodeResolved.out.endsWith("dist/index.js")).toBe(true);
    } finally {
      rmSync(staged.stage, { recursive: true, force: true });
    }
  }, 240_000);

  test("./client/browser still resolves to the prebuilt standalone artifact", async () => {
    const staged = await stageTarball();
    if (!staged) throw new Error("stage failed (npm unavailable?)");
    try {
      const dir = installConsumer(staged.stage, "t-browser", staged.tgzPath);
      const resolved = run(
        'bun -e \'console.log(Bun.resolveSync("lugas/client/browser", process.cwd()))\'',
        dir,
      );
      expect(resolved.out.endsWith("build/lugas-client.esm.js")).toBe(true);
    } finally {
      rmSync(staged.stage, { recursive: true, force: true });
    }
  }, 240_000);
});
