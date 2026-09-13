/**
 * Library distribution builder (CA-17).
 *
 * Compiles Lugas TypeScript sources into a module-preserving ESM distribution
 * with complete declarations in `dist/`:
 *
 * 1. Emits module-preserving JavaScript via `bun build --target=bun --no-bundle`
 * 2. Emits declaration files via `tsc -p tsconfig.dist.json`
 * 3. Stamps the candidate framework version into runtime constants
 * 4. Ensures CLI executable permissions
 *
 * Explicitly operates against `sourceRoot` (e.g. clean staging directory)
 * to guarantee provenance and prevent cross-directory contamination.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "../..");

export interface BuildDistOptions {
  sourceRoot: string;
  version?: string;
}

export interface BuildDistResult {
  outDir: string;
  jsFileCount: number;
  dtsFileCount: number;
  totalBytes: number;
}

function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.includes(".test.") && !entry.name.endsWith(".d.ts")) {
      results.push(full);
    }
  }
  return results;
}

export async function buildDist(options: BuildDistOptions): Promise<BuildDistResult> {
  const sourceRoot = resolve(options.sourceRoot);
  const srcDir = join(sourceRoot, "src");
  const distDir = join(sourceRoot, "dist");

  if (!existsSync(srcDir)) {
    throw new Error(`buildDist: src directory not found at ${srcDir}`);
  }

  // 1. Stamp framework version if provided
  if (options.version) {
    const versionTsPath = join(srcDir, "internal", "framework-version.ts");
    const versionTsContent =
      `/** Generated build constant — synced from package.json by scripts/sync-version.ts. Do not edit by hand. */\n` +
      `export const FRAMEWORK_VERSION = ${JSON.stringify(options.version)};\n`;
    writeFileSync(versionTsPath, versionTsContent);
  }

  // Clean output directory
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });

  // 2. Transpile all src TypeScript files into module-preserving ESM JavaScript
  const tsFiles = findTsFiles(srcDir);
  if (tsFiles.length === 0) {
    throw new Error(`buildDist: no TypeScript files found in ${srcDir}`);
  }

  const buildProc = Bun.spawnSync([
    process.execPath,
    "build",
    ...tsFiles,
    "--target=bun",
    `--root=${srcDir}`,
    `--outdir=${distDir}`,
    "--no-bundle",
  ], { cwd: sourceRoot });

  if (buildProc.exitCode !== 0) {
    throw new Error(`buildDist: bun build failed:\n${new TextDecoder().decode(buildProc.stderr)}`);
  }

  // 3. Emit declaration files (.d.ts) using dedicated tsconfig.dist.json
  const tsconfigPath = join(sourceRoot, "tsconfig.dist.json");
  if (!existsSync(tsconfigPath)) {
    // If not in sourceRoot (e.g. staging), copy from repo root
    const rootConfig = readFileSync(join(REPO_ROOT, "tsconfig.dist.json"), "utf8");
    writeFileSync(tsconfigPath, rootConfig);
  }

  const tscBinary = join(REPO_ROOT, "node_modules", ".bin", "tsc");
  const tscProc = Bun.spawnSync([
    process.execPath,
    tscBinary,
    "-p",
    tsconfigPath,
    "--outDir",
    distDir,
    "--rootDir",
    srcDir,
    "--typeRoots",
    join(REPO_ROOT, "node_modules"),
  ], { cwd: sourceRoot });

  if (tscProc.exitCode !== 0) {
    throw new Error(`buildDist: tsc declaration emission failed:\n${new TextDecoder().decode(tscProc.stderr) || new TextDecoder().decode(tscProc.stdout)}`);
  }

  // 4. Ensure version stamp is reflected in runtime dist
  if (options.version) {
    const versionJsPath = join(distDir, "internal", "framework-version.js");
    const versionJsContent = `export const FRAMEWORK_VERSION = ${JSON.stringify(options.version)};\n`;
    writeFileSync(versionJsPath, versionJsContent);
  }

  // 5. Ensure CLI has executable permissions and shebang
  const cliPath = join(distDir, "cli", "main.js");
  if (existsSync(cliPath)) {
    let content = readFileSync(cliPath, "utf8");
    if (!content.startsWith("#!/usr/bin/env bun")) {
      content = `#!/usr/bin/env bun\n${content}`;
      writeFileSync(cliPath, content);
    }
    chmodSync(cliPath, 0o755);
  }

  // 6. Verify existence of required entry files
  const requiredEntries = [
    "index.js",
    "index.d.ts",
    "client/index.js",
    "client/index.d.ts",
    "drizzle/index.js",
    "drizzle/index.d.ts",
    "testing/index.js",
    "testing/index.d.ts",
    "cli/main.js",
  ];

  for (const entry of requiredEntries) {
    const entryPath = join(distDir, entry);
    if (!existsSync(entryPath)) {
      throw new Error(`buildDist verification failed: missing required entry ${entry} at ${entryPath}`);
    }
  }

  // Count files and total size
  let jsCount = 0;
  let dtsCount = 0;
  let totalBytes = 0;

  function scan(dir: string) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, item.name);
      if (item.isDirectory()) scan(full);
      else if (item.isFile()) {
        totalBytes += statSync(full).size;
        if (item.name.endsWith(".d.ts")) dtsCount++;
        else if (item.name.endsWith(".js")) jsCount++;
      }
    }
  }
  scan(distDir);

  return {
    outDir: distDir,
    jsFileCount: jsCount,
    dtsFileCount: dtsCount,
    totalBytes,
  };
}

// Standalone execution support
const isDirect = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.path);
if (isDirect) {
  const target = process.argv[2] ? resolve(process.argv[2]) : REPO_ROOT;
  const res = await buildDist({ sourceRoot: target });
  console.log(`✓ buildDist completed in ${res.outDir}`);
  console.log(`  ${res.jsFileCount} JS files, ${res.dtsFileCount} declaration files, ${(res.totalBytes / 1024).toFixed(1)} KiB total`);
}
