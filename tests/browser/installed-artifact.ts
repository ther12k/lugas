/**
 * Installed-artifact staging for the M7-005 browser lane (ADR-0021 §5).
 *
 * Packs the package (with the prebuilt browser artifact) and installs that
 * exact tarball into an unrelated temporary directory. The source checkout
 * is outside the consumer's module resolution path; the returned artifact
 * path points INTO the installed node_modules tree, which is the file the
 * stage-two page must load.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "./browser-env";

const BETA_VERSION = "0.1.0-beta.1";

export function npmAvailable(): boolean {
  const probe = Bun.spawnSync(["npm", "--version"], { stdout: "pipe", stderr: "pipe" });
  return probe.exitCode === 0 && new TextDecoder().decode(probe.stdout).trim() !== "";
}

export type InstalledArtifact = {
  /** Absolute path of build/lugas-client.esm.js INSIDE the installed tree. */
  readonly artifactPath: string;
  /** Temporary consumer directory (caller removes via cleanup()). */
  readonly consumerDir: string;
  cleanup: () => void;
};

export async function installArtifactPackage(): Promise<InstalledArtifact> {
  const stage = mkdtempSync(join(tmpdir(), "lugas-m7005-stage-"));
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
  pkg.version = BETA_VERSION;
  delete pkg.scripts["release:package:rehearse"];
  delete pkg.private;
  pkg.publishConfig = { access: "public" };
  pkg.bin = { lugas: "./src/cli/main.ts" };
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const { buildBrowserClient } = await import("../../scripts/release/build-browser-client");
  await buildBrowserClient(join(stagePkg, "build"));

  const out = execSync("npm pack --json", { cwd: stagePkg, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const parsed = JSON.parse(out) as Array<{ filename: string }>;
  const tgzPath = join(stagePkg, parsed[0]!.filename);

  const consumerDir = mkdtempSync(join(tmpdir(), "lugas-m7005-consumer-"));
  writeFileSync(join(consumerDir, "package.json"), JSON.stringify({ name: "lugas-m7005-consumer", private: true }, null, 2));
  execSync(`bun install --no-save ${tgzPath}`, { cwd: consumerDir, stdio: "pipe" });
  rmSync(stage, { recursive: true, force: true });

  const artifactPath = join(consumerDir, "node_modules", "lugas", "build", "lugas-client.esm.js");
  if (!existsSync(artifactPath)) {
    rmSync(consumerDir, { recursive: true, force: true });
    throw new Error(`installed tarball did not carry the browser artifact at ${artifactPath}`);
  }
  return {
    artifactPath,
    consumerDir,
    cleanup: () => rmSync(consumerDir, { recursive: true, force: true }),
  };
}
