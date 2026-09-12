/**
 * Starter setup: pack the CURRENT lugas checkout into a tarball and install
 * it into this starter, so every import resolves from the installed package
 * — never from the repository checkout (consumer-truth requirement).
 *
 * Refresh-safe: rerun any time; the tarball is replaced and `bun install`
 * re-resolves `file:lugas-starter.tgz`.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..", "..", "..");
const STARTER = join(import.meta.dir, "..");
const TARBALL = join(STARTER, "lugas-starter.tgz");

if (!existsSync(join(REPO, "package.json"))) {
  console.error("setup must run inside the lugas repository checkout");
  process.exit(1);
}

// 1. Stage the checkout without dependency/worktree/release noise.
const stage = mkdtempSync(join(tmpdir(), "lugas-starter-stage-"));
const staged = join(stage, "package");
mkdirSync(staged, { recursive: true });
cpSync(REPO, staged, {
  recursive: true,
  filter: (src) => {
    const rel = src.slice(REPO.length);
    if (!rel || rel === "/") return true;
    return (
      !rel.includes("/node_modules/") && !rel.endsWith("/node_modules") &&
      !rel.includes("/.worktrees/") && !rel.endsWith("/.worktrees") &&
      !rel.includes("/.git/") && !rel.endsWith("/.git") &&
      !rel.startsWith("/benchmarks/results/") &&
      !rel.startsWith("/docs/releases/") &&
      !rel.startsWith("/examples/spa-starter/")
    );
  },
});

// 2. Make it packable as a stand-in release: versioned, public, installable.
const pkgPath = join(staged, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
  version: string;
  private?: boolean;
  scripts: Record<string, string>;
} & Record<string, unknown>;
pkg.version = "0.0.0-starter";
delete pkg.private;
delete pkg.scripts["release:package:rehearse"];
pkg.publishConfig = { access: "public" };
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

// 3. Pack and install into the starter.
const packed = Bun.spawnSync(["bun", "pm", "pack"], { cwd: staged });
if (packed.exitCode !== 0) {
  console.error(new TextDecoder().decode(packed.stderr));
  process.exit(1);
}
const packedName = new TextDecoder().decode(packed.stdout).match(/(lugas-[^\s/]+\.tgz)/)?.[1];
if (!packedName) {
  console.error("pack produced no tarball name");
  process.exit(1);
}
rmSync(TARBALL, { force: true });
cpSync(join(staged, packedName), TARBALL);
rmSync(stage, { recursive: true, force: true });
// Remove the previously installed lugas AND the lockfile: bun resolves
// file: dependencies through lockfile-cached state, which can leave stale
// package sources behind when only the tarball contents changed. The
// lockfile regenerates deterministically from package.json's carets.
rmSync(join(STARTER, "node_modules", "lugas"), { recursive: true, force: true });
rmSync(join(STARTER, "bun.lock"), { force: true });

const install = Bun.spawnSync(["bun", "install"], { cwd: STARTER });
const tail = new TextDecoder().decode(install.stderr).trim().split("\n").slice(-4).join("\n");
if (install.exitCode !== 0) {
  console.error(tail);
  process.exit(1);
}
console.log(`setup complete: ${TARBALL} (lugas@0.0.0-starter installed)`);
if (tail) console.log(tail);
