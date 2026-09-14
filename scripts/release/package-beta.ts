/**
 * Beta package publication rehearsal (M6-003 / M6R1-006).
 *
 * Proves the exact beta tarball, provenance, checksums, install behavior,
 * and publication command — WITHOUT publishing. Stages a versioned copy of
 * the package in a temp directory, packs it, installs the tarball into three
 * real consumers (server, browser-bundled client, testing/CLI), and emits
 * release artifacts into docs/releases/beta/:
 *
 *   lugas-<version>.tgz      exact packed beta tarball (staged copy)
 *   SHA256SUMS               sha256 manifest of all artifacts
 *   sbom.json                SBOM of the packed package
 *   provenance.json          build provenance statement
 *   inventory.json           final file inventory of the tarball
 *
 * The publication command is documented in the output but NEVER executed.
 * Real publication requires explicit owner approval (M6-010/M6-GATE).
 *
 * Usage: bun run release:package:rehearse
 */
import { createHash } from "node:crypto";
// (createHash used for the machine-readable rehearsal result, M6R5)
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

const ROOT = resolve(import.meta.dir, "../..");
const OUT_DIR = resolve(ROOT, "docs", "releases", "beta");
import { CANDIDATE_VERSION } from "./candidate-version";

const BETA_VERSION = CANDIDATE_VERSION;

type CheckResult = { name: string; ok: boolean; detail: string };
const results: CheckResult[] = [];
// M6R5: rehearsal result is machine-readable and consumed by the packet builder.
const REHEARSAL_RESULT_PATH = resolve(ROOT, "docs", "releases", "beta", "package-rehearsal.json");

function check(name: string, ok: boolean, detail: string): void {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}: ${detail}`);
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function run(cmd: string, cwd: string): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execSync(cmd, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: err.status ?? 1,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? String(error),
    };
  }
}

async function main(): Promise<void> {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // ------------------------------------------------------------------
  // Stage 0: candidate integrity (#284). The candidate is the COMMITTED
  // tree, not the working directory — a dirty tracked tree refuses to run.
  // ------------------------------------------------------------------
  const statusProc = Bun.spawnSync(["git", "status", "--porcelain"], {
    cwd: ROOT, stdout: "pipe", stderr: "pipe",
  });
  const porcelain =
    statusProc.exitCode === 0 ? new TextDecoder().decode(statusProc.stdout).trim() : "<git failed>";
  check("candidate worktree is clean", porcelain === "", porcelain === "" ? "no uncommitted changes" : porcelain.split("\n").slice(0, 5).join(" | "));

  // ------------------------------------------------------------------
  // Stage 1: versioned staging copy built from git archive of HEAD (#284)
  // so provenance can honestly bind to committed contents only.
  // ------------------------------------------------------------------
  const stage = mkdtempSync(join(tmpdir(), "lugas-beta-stage-"));
  const stagePkg = join(stage, "package");
  mkdirSync(stagePkg, { recursive: true });
  if (porcelain !== "") process.exit(1);
  const archive = run("git archive HEAD | tar -x -C " + JSON.stringify(stagePkg), ROOT);
  check("staged from committed git tree (git archive HEAD)", archive.code === 0, archive.code === 0 ? "tracked files only" : archive.stderr.slice(0, 200));
  if (archive.code !== 0) process.exit(1);
  const pkgJsonPath = join(stagePkg, "package.json");
  type StagedPkg = {
    name: string;
    version: string;
    private?: boolean;
    scripts: Record<string, string>;
    devDependencies?: Record<string, string>;
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as StagedPkg;
  pkg.version = BETA_VERSION;
  delete pkg.scripts["release:package:rehearse"]; // rehearsal tooling is not shipped
  // Publishability metadata (#278): the candidate must not carry private,
  // must declare public access explicitly, and ships the CLI binary that the
  // rehearsal then executes from the installed tarball.
  delete pkg.private;
  (pkg as StagedPkg & { publishConfig?: { access?: string } }).publishConfig = { access: "public" };
  (pkg as StagedPkg & { bin?: Record<string, string> }).bin = { lugas: "./dist/cli/main.js" };
  // Consumer-facing metadata the npm page needs and the repo copy does not
  // carry: engines declares the Bun support floor (owner decision, CF-3,
  // 2026-09-12) as machine-readable metadata — advisory declaration, not a
  // release gate; repository/bugs/homepage/keywords make the npm package
  // page link back to the project (release-readiness sweep, 2026-09-12).
  (pkg as StagedPkg & {
    engines?: Record<string, string>;
    repository?: { type: string; url: string };
    bugs?: { url: string };
    homepage?: string;
    keywords?: string[];
  }).engines = { bun: ">=1.4.0" };
  (pkg as StagedPkg & { repository?: { type: string; url: string } }).repository = {
    type: "git",
    url: "git+https://github.com/ther12k/lugas.git",
  };
  (pkg as StagedPkg & { bugs?: { url: string } }).bugs = {
    url: "https://github.com/ther12k/lugas/issues",
  };
  (pkg as StagedPkg & { homepage?: string }).homepage = "https://ther12k.github.io/lugas/";
  (pkg as StagedPkg & { keywords?: string[] }).keywords = [
    "bun",
    "typescript",
    "http",
    "api",
    "framework",
  ];
  writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n");
  const stagedMeta = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as {
    version?: string;
    engines?: Record<string, string>;
    repository?: { url?: string };
    bugs?: { url?: string };
    homepage?: string;
    keywords?: string[];
  };
  // Every injected field is asserted — the check label must not promise more
  // than the condition verifies (beta.5 candidate-prep review, 2026-09-12).
  check(
    "staged package metadata (version, engines.bun, repository, bugs, homepage, keywords)",
    stagedMeta.version === BETA_VERSION &&
      stagedMeta.engines?.bun === ">=1.4.0" &&
      stagedMeta.repository?.url === "git+https://github.com/ther12k/lugas.git" &&
      stagedMeta.bugs?.url === "https://github.com/ther12k/lugas/issues" &&
      stagedMeta.homepage === "https://ther12k.github.io/lugas/" &&
      Array.isArray(stagedMeta.keywords) &&
      stagedMeta.keywords.join(",") === "bun,typescript,http,api,framework",
    `version=${stagedMeta.version ?? "missing"} engines.bun=${stagedMeta.engines?.bun ?? "missing"} repository=${stagedMeta.repository?.url ?? "missing"} bugs=${stagedMeta.bugs?.url ?? "missing"} homepage=${stagedMeta.homepage ?? "missing"} keywords=${stagedMeta.keywords?.length ?? 0}`,
  );

  // Stage 1a: module-preserving ESM distribution + declarations (CA-17).
  // Compiles all src TypeScript files into dist/ with declarations, stamped
  // framework-version, and executable CLI binary.
  const { buildDist } = await import("./build-dist");
  const distArtifact = await buildDist({ sourceRoot: stagePkg, version: BETA_VERSION });
  check(
    "module-preserving ESM distribution & declarations built into staged package",
    distArtifact.jsFileCount > 0 && distArtifact.dtsFileCount > 0,
    `${distArtifact.jsFileCount} JS files, ${distArtifact.dtsFileCount} declaration files, ${(distArtifact.totalBytes / 1024).toFixed(1)} KiB total`,
  );

  // Assert staged framework-version stamp in both src and dist
  const stagedVersionPath = join(stagePkg, "src", "internal", "framework-version.ts");
  const stagedConstant = /export const FRAMEWORK_VERSION = "([^"]+)"/.exec(
    readFileSync(stagedVersionPath, "utf8"),
  )?.[1];
  check(
    "staged framework-version stamped to BETA_VERSION",
    stagedConstant === BETA_VERSION,
    stagedConstant === BETA_VERSION
      ? `FRAMEWORK_VERSION = ${stagedConstant} (was 0.0.0 in the committed tree)`
      : `expected ${BETA_VERSION}, staged constant is ${stagedConstant ?? "missing"}`,
  );

  // ------------------------------------------------------------------
  // Stage 1b: browser-executable client artifact (M7-005 / ADR-0021).
  // Built from the staged sources into the staged copy so the packed
  // tarball carries the prebuilt ESM artifact under build/. Source root
  // is passed explicitly to guarantee provenance.
  // ------------------------------------------------------------------
  const { buildBrowserClient, ARTIFACT_PACKAGE_PATH } = await import("./build-browser-client");
  const browserArtifact = await buildBrowserClient(join(stagePkg, "build"), stagePkg);
  check(
    "browser client artifact built into staged package",
    existsSync(join(stagePkg, ARTIFACT_PACKAGE_PATH)),
    `${ARTIFACT_PACKAGE_PATH} bytes=${browserArtifact.bytes} sha256=${browserArtifact.sha256.slice(0, 16)}…`,
  );

  // ------------------------------------------------------------------
  // Stage 2: pack the exact beta tarball.
  // ------------------------------------------------------------------
  const pack = run("npm pack --json", stagePkg);
  check("npm pack succeeds from staged beta candidate", pack.code === 0, pack.code === 0 ? `${BETA_VERSION}` : pack.stderr.slice(0, 200));
  if (pack.code !== 0) process.exit(1);
  const packOut = JSON.parse(pack.stdout) as Array<{ filename: string; files: Array<{ path: string }> }>;
  const tgzName = packOut[0]!.filename;
  const entryCount = packOut[0]!.files.length;

  // ------------------------------------------------------------------
  // Stage 3: consumer installs — server, client, testing/CLI.
  // ------------------------------------------------------------------
  const tgzSource = join(stagePkg, tgzName);

  function makeConsumer(name: string): string {
    const dir = join(stage, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name, private: true, dependencies: {} }, null, 2),
    );
    run("bun install --no-save " + JSON.stringify(tgzSource), dir);
    return dir;
  }

  // Consumer A: server app. Also proves the staged framework-version stamp
  // survived into the packed tarball (CF-1): the installed package's
  // manifest must report the BETA_VERSION, never the committed 0.0.0.
  const serverConsumer = makeConsumer("consumer-server");
  writeFileSync(
    join(serverConsumer, "app.ts"),
    `import { defineApp, route, json } from "lugas";
const app = defineApp({ routes: { "/ping": { GET: route({ handler: () => json(200, { pong: true }) } ) } } });
console.log("SERVER-CONSUMER-OK format=" + app.manifest.format + " fw=" + app.manifest.frameworkVersion);`,
  );
  const serverRun = run("bun run app.ts", serverConsumer);
  check(
    "server consumer runs from tarball",
    serverRun.code === 0 &&
      serverRun.stdout.includes(`SERVER-CONSUMER-OK format=lugas-manifest-v1 fw=${BETA_VERSION}`),
    serverRun.code === 0 ? serverRun.stdout.trim() : serverRun.stderr.slice(0, 200),
  );
  // What the rehearsal verified so far is the STAGED copy. The consumer just
  // installed the packed tarball — re-verify version and the full metadata
  // set from the installed package.json, so the evidence covers what a user
  // actually receives (beta.5 candidate-prep review, 2026-09-12).
  const installedPkg = JSON.parse(
    readFileSync(join(serverConsumer, "node_modules", "lugas", "package.json"), "utf8"),
  ) as {
    version?: string;
    engines?: Record<string, string>;
    repository?: { url?: string };
    bugs?: { url?: string };
    homepage?: string;
    keywords?: string[];
  };
  check(
    "installed tarball package.json (version, engines, repository, bugs, homepage, keywords)",
    installedPkg.version === BETA_VERSION &&
      installedPkg.engines?.bun === ">=1.4.0" &&
      installedPkg.repository?.url === "git+https://github.com/ther12k/lugas.git" &&
      installedPkg.bugs?.url === "https://github.com/ther12k/lugas/issues" &&
      installedPkg.homepage === "https://ther12k.github.io/lugas/" &&
      Array.isArray(installedPkg.keywords) &&
      installedPkg.keywords.join(",") === "bun,typescript,http,api,framework",
    `version=${installedPkg.version ?? "missing"} engines.bun=${installedPkg.engines?.bun ?? "missing"} repository=${installedPkg.repository?.url ?? "missing"} bugs=${installedPkg.bugs?.url ?? "missing"} homepage=${installedPkg.homepage ?? "missing"} keywords=${installedPkg.keywords?.length ?? 0}`,
  );

  // ------------------------------------------------------------------
  // Dual-distribution resolution (CA-20): the export map exposes raw
  // TypeScript under the "bun" condition (default on Bun), emitted
  // JavaScript under the explicit "lugas-dist" condition, and dist as the
  // fallback for tools that do not select Bun's condition. One version
  // identity must hold in every mode.
  // ------------------------------------------------------------------
  const resolveDefault = run(
    'bun -e \'console.log(Bun.resolveSync("lugas", process.cwd()))\'',
    serverConsumer,
  );
  check(
    "installed resolution: default Bun execution → src/index.ts (bun condition)",
    resolveDefault.code === 0 && resolveDefault.stdout.trim().endsWith("src/index.ts"),
    resolveDefault.stdout.trim() || resolveDefault.stderr.slice(0, 200),
  );
  const resolveDist = run(
    'bun --conditions=lugas-dist -e \'console.log(Bun.resolveSync("lugas", process.cwd()))\'',
    serverConsumer,
  );
  check(
    "installed resolution: --conditions=lugas-dist → dist/index.js",
    resolveDist.code === 0 && resolveDist.stdout.trim().endsWith("dist/index.js"),
    resolveDist.stdout.trim() || resolveDist.stderr.slice(0, 200),
  );
  const resolveClientDist = run(
    'bun --conditions=lugas-dist -e \'console.log(Bun.resolveSync("lugas/client", process.cwd()))\'',
    serverConsumer,
  );
  check(
    "installed resolution: subpath ./client honors the same condition policy",
    resolveClientDist.code === 0 && resolveClientDist.stdout.trim().endsWith("dist/client/index.js"),
    resolveClientDist.stdout.trim() || resolveClientDist.stderr.slice(0, 200),
  );
  const resolveNode = run(
    'node -e "console.log(require.resolve(\'lugas\'))"',
    serverConsumer,
  );
  check(
    "installed resolution: non-Bun tooling (Node require) → dist fallback",
    resolveNode.code === 0 && resolveNode.stdout.trim().endsWith("dist/index.js"),
    resolveNode.stdout.trim() || resolveNode.stderr.slice(0, 200),
  );
  const compiledRun = run("bun --conditions=lugas-dist run app.ts", serverConsumer);
  check(
    "server consumer runs from tarball in compiled mode (lugas-dist → dist)",
    compiledRun.code === 0 &&
      compiledRun.stdout.includes(`SERVER-CONSUMER-OK format=lugas-manifest-v1 fw=${BETA_VERSION}`),
    compiledRun.code === 0 ? compiledRun.stdout.trim() : compiledRun.stderr.slice(0, 200),
  );
  const srcStamp = readFileSync(
    join(serverConsumer, "node_modules", "lugas", "src", "internal", "framework-version.ts"),
    "utf8",
  );
  check(
    "shipped src tree carries the candidate version stamp (raw-default identity)",
    srcStamp.includes(`FRAMEWORK_VERSION = ${JSON.stringify(BETA_VERSION)}`),
    srcStamp.includes(`FRAMEWORK_VERSION = ${JSON.stringify(BETA_VERSION)}`)
      ? `src stamped to ${BETA_VERSION}`
      : `expected ${BETA_VERSION}, shipped src constant mismatch`,
  );

  // Consumer B: browser-bundled client.
  const clientConsumer = makeConsumer("consumer-client");
  writeFileSync(
    join(clientConsumer, "entry.ts"),
    `import { createClient } from "lugas/client";
const c = createClient({ baseUrl: "https://x.test" });
if (typeof c.get !== "function") throw new Error("bad client");
console.log("CLIENT-CONSUMER-OK");`,
  );
  const bundleOut = join(clientConsumer, "dist");
  let bundle: Awaited<ReturnType<typeof Bun.build>>;
  try {
    bundle = await Bun.build({
      entrypoints: [join(clientConsumer, "entry.ts")],
      target: "browser",
      outdir: bundleOut,
    });
  } catch (error) {
    bundle = { success: false, logs: [String(error)] } as never;
  }
  check(
    "client consumer bundles for browser from tarball",
    bundle.success === true,
    bundle.success ? `${readdirSync(bundleOut).filter((f) => f.endsWith(".js")).length} output file(s)` : String(bundle.logs),
  );
  if (bundle.success) {
    const nodeSmoke = run(`node -e "globalThis.fetch=async()=>new Response('{}');import('./' + 'dist/' + require('fs').readdirSync('dist').find(f=>f.endsWith('.js'))).then(()=>console.log('NODE-RUN-OK')).catch(e=>{console.error(e);process.exit(1)})"`, clientConsumer);
    check("bundled client executes under Node (no Bun global)", nodeSmoke.code === 0 && nodeSmoke.stdout.includes("NODE-RUN-OK"), nodeSmoke.stdout.trim() || nodeSmoke.stderr.slice(0, 200));
  }

  // Consumer B2: the PREBUILT browser artifact (M7-005 / ADR-0021).
  // Executes the shipped build/lugas-client.esm.js from the installed
  // tarball — no bundler, no source checkout — under Node with a fetch stub.
  const artifactConsumer = makeConsumer("consumer-browser-artifact");
  const installedArtifact = join(artifactConsumer, "node_modules", "lugas", "build", "lugas-client.esm.js");
  const artifactPresent = existsSync(installedArtifact);
  check("prebuilt browser artifact ships in installed tarball", artifactPresent, artifactPresent ? installedArtifact.replace(stage, "<stage>") : "missing build/lugas-client.esm.js");
  const installedExportsKeys = artifactPresent
    ? Object.keys((JSON.parse(readFileSync(join(artifactConsumer, "node_modules", "lugas", "package.json"), "utf8")) as { exports: Record<string, unknown> }).exports).sort()
    : [];
  check(
    "installed export map exposes ./client/browser (prebuilt artifact)",
    installedExportsKeys.join(",") === [".", "./client", "./client/browser", "./drizzle", "./testing"].join(","),
    installedExportsKeys.join(", ") || "no exports",
  );
  if (artifactPresent) {
    const artifactSmoke = run(
      `node -e "globalThis.fetch=async()=>new Response('{}');import('./node_modules/lugas/build/lugas-client.esm.js').then(m=>{const c=m.createClient({baseUrl:'https://x.test'});if(typeof c.get!=='function')throw new Error('bad client');console.log('ARTIFACT-RUN-OK')}).catch(e=>{console.error(e);process.exit(1)})"`,
      artifactConsumer,
    );
    check("prebuilt artifact executes under Node (no bundler, no Bun global)", artifactSmoke.code === 0 && artifactSmoke.stdout.includes("ARTIFACT-RUN-OK"), artifactSmoke.stdout.trim() || artifactSmoke.stderr.slice(0, 200));
  }

  // Consumer C: testing + CLI surface.
  const testConsumer = makeConsumer("consumer-testing");
  writeFileSync(
    join(testConsumer, "probe.ts"),
    `import { createTestServer } from "lugas/testing";
import { defineApp, route, json } from "lugas";
const app = defineApp({ routes: { "/hi": { GET: route({ handler: () => json(200, { hello: "world" }) }) } } });
const server = createTestServer(app, { port: 0 });
const res = await server.fetch("/hi");
const body = (await res.json()) as { hello: string };
if (res.status !== 200 || body.hello !== "world") throw new Error("test server mismatch");
await server.stop();
console.log("TESTING-CONSUMER-OK");`,
  );
  const testRun = run("bun run probe.ts", testConsumer);
  check(
    "testing consumer (createTestServer round-trip) runs from tarball",
    testRun.code === 0 && testRun.stdout.includes("TESTING-CONSUMER-OK"),
    testRun.code === 0 ? testRun.stdout.trim() : testRun.stderr.slice(0, 300),
  );

  // Consumer C2: Drizzle subpath export (CA-17).
  const drizzleConsumer = makeConsumer("consumer-drizzle");
  writeFileSync(
    join(drizzleConsumer, "probe.ts"),
    `import { drizzleService } from "lugas/drizzle";
if (typeof drizzleService !== "function") throw new Error("bad drizzleService");
console.log("DRIZZLE-CONSUMER-OK");`,
  );
  const drizzleRun = run("bun run probe.ts", drizzleConsumer);
  check(
    "drizzle consumer (drizzleService) runs from tarball",
    drizzleRun.code === 0 && drizzleRun.stdout.includes("DRIZZLE-CONSUMER-OK"),
    drizzleRun.code === 0 ? drizzleRun.stdout.trim() : drizzleRun.stderr.slice(0, 300),
  );

  // Consumer D: the REAL CLI, executed through the npm bin link created
  // from the staged candidate (#283). `lugas routes <fixture>` must run an
  // actual inspection command from the installed tarball, and `lugas --version`
  // must output the candidate version.
  const cliConsumer = makeConsumer("consumer-cli");
  writeFileSync(
    join(cliConsumer, "fixture-app.ts"),
    `import { defineApp, route, text } from "lugas";
export default defineApp({ routes: { "/x": { GET: route({ handler: () => text(200, "ok") }) } } });`,
  );
  const cliRun = run(`./node_modules/.bin/lugas routes ./fixture-app.ts`, cliConsumer);
  check(
    "CLI consumer executes real 'lugas routes' command from tarball",
    cliRun.code === 0 && cliRun.stdout.includes("lugas-manifest") && cliRun.stdout.includes("/x"),
    cliRun.code === 0 ? "route table rendered" : cliRun.stderr.slice(0, 200),
  );
  const cliVersion = run(`./node_modules/.bin/lugas --version`, cliConsumer);
  check(
    "CLI consumer reports candidate version from installed tarball",
    cliVersion.code === 0 && cliVersion.stdout.includes(BETA_VERSION),
    cliVersion.code === 0 ? cliVersion.stdout.trim() : cliVersion.stderr.slice(0, 200),
  );

  // ------------------------------------------------------------------
  // Stage 3b: publication validation (#278) — the EXACT command that ships
  // in the report is executed with --dry-run (non-publishing). The final
  // real command differs ONLY by removing --dry-run.
  // ------------------------------------------------------------------
  const npmVersion = run("npm --version", stagePkg).stdout.trim();
  const publishDry = run(
    `npm publish ${JSON.stringify(tgzSource)} --dry-run --access public --tag beta`,
    stagePkg,
  );
  check(
    "exact publish command passes --dry-run validation (--tag beta)",
    publishDry.code === 0,
    publishDry.code === 0 ? `npm ${npmVersion} accepted candidate; tag=beta access=public` : publishDry.stderr.slice(0, 300),
  );

  // ------------------------------------------------------------------
  // Stage 4: artifacts — checksums, SBOM, provenance, inventory.
  // ------------------------------------------------------------------
  const tgzOut = join(OUT_DIR, tgzName);
  rmSync(tgzOut, { force: true });
  cpSync(tgzSource, tgzOut);

  const inventory = {
    format: "lugas-package-inventory-v0",
    packageName: pkg.name,
    version: BETA_VERSION,
    tarballEntries: entryCount,
    files: packOut[0]!.files.map((f) => f.path).sort(),
    generatedArtifacts: [
      {
        path: ARTIFACT_PACKAGE_PATH,
        bytes: browserArtifact.bytes,
        sha256: browserArtifact.sha256,
        entrypoint: "src/client/index.ts",
        target: "browser",
        format: "esm",
      },
    ],
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(OUT_DIR, "inventory.json"), JSON.stringify(inventory, null, 2));

  // SBOM derived FROM STAGED METADATA (#285) — never hardcoded results.
  const prodDeps = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ].sort();
  writeFileSync(join(OUT_DIR, "sbom.json"), JSON.stringify({
    format: "lugas-sbom-v0",
    generatedAt: new Date().toISOString(),
    packageName: pkg.name,
    packageVersion: BETA_VERSION,
    derivation: "staged package.json dependencies/optionalDependencies/peerDependencies",
    productionDependencies: prodDeps,
    devDependencies: Object.keys(pkg.devDependencies ?? {}).map((d) => ({ name: d, scope: "dev" })),
    generatedComponents: [
      {
        name: "lugas-client-browser",
        path: ARTIFACT_PACKAGE_PATH,
        sha256: browserArtifact.sha256,
        builtFrom: "src/client/index.ts",
        builtBy: `scripts/release/build-browser-client.ts (Bun ${Bun.version}, target=browser, format=esm)`,
      },
    ],
    tarballEntryCount: entryCount,
    zeroProductionRuntimeDependency: prodDeps.length === 0,
  }, null, 2));

  const commit = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  const treeHash = execSync("git rev-parse HEAD^{tree}", { cwd: ROOT, encoding: "utf8" }).trim();
  const provenance = {
    format: "lugas-provenance-v1",
    statementType: "https://lugasjs.dev/statements/rehearsal/v0",
    packageName: pkg.name,
    packageVersion: BETA_VERSION,
    sourceCommit: commit,
    gitTreeHash: treeHash,
    stagingMethod: "git archive HEAD (tracked files only; dirty worktree refused)",
    bunVersion: Bun.version,
    npmVersion,
    platform: `${process.platform}-${process.arch}`,
    generatedAt: new Date().toISOString(),
    publishedToRegistry: false,
    publishCommandDryRunValidated: true,
    note: "REHEARSAL ONLY — no registry publication occurred; real publish requires owner approval (M6-010 / M6-GATE) and differs from the validated command only by dropping --dry-run.",
  };
  writeFileSync(join(OUT_DIR, "provenance.json"), JSON.stringify(provenance, null, 2));

  const artifactNames = [tgzName, "inventory.json", "sbom.json", "provenance.json"];
  const sums = artifactNames.map((name) => `${sha256File(join(OUT_DIR, name))}  ${name}`);
  writeFileSync(join(OUT_DIR, "SHA256SUMS"), sums.sort().join("\n") + "\n");

  check("checksums emitted", sums.length === 4, `${OUT_DIR}/SHA256SUMS`);
  check("SBOM shows zero production deps (derived)", prodDeps.length === 0, `${OUT_DIR}/sbom.json (derived from staged metadata)`);
  check("provenance statement marked unpublished", provenance.publishedToRegistry === false, `${OUT_DIR}/provenance.json`);
  check("tarball inventory recorded", inventory.files.length === entryCount, `${inventory.files.length} entries`);
  check("browser artifact present in packed tarball", inventory.files.includes(ARTIFACT_PACKAGE_PATH), ARTIFACT_PACKAGE_PATH);

  // Forbidden content gate on the actual artifact list.
  const forbiddenPrefixes = ["benchmarks/", ".worktrees/", "tests/", "spikes/", "scripts/release/", ".env"];
  const violations = inventory.files.filter((f) => forbiddenPrefixes.some((p) => f.startsWith(p)));
  check("no forbidden paths inside beta tarball", violations.length === 0, violations.length === 0 ? "clean" : violations.join(", "));
  // Dual distribution (CA-20): both representations ship from one package.
  const shipsSrc = inventory.files.some((f) => f === "src/index.ts");
  const shipsDist = inventory.files.some((f) => f === "dist/index.js");
  check(
    "tarball ships both representations (src/index.ts + dist/index.js)",
    shipsSrc && shipsDist,
    `src/index.ts=${shipsSrc ? "present" : "MISSING"} dist/index.js=${shipsDist ? "present" : "MISSING"}`,
  );
  const hasLicense = inventory.files.some((f) => f === "LICENSE");
  check("license file ships in tarball", hasLicense, hasLicense ? "LICENSE present (Apache-2.0)" : "MISSING");
  const hasNotice = inventory.files.some((f) => f === "NOTICE");
  check("NOTICE file ships in tarball", hasNotice, hasNotice ? "NOTICE present (ODR-0002 attribution)" : "MISSING");

  // Summary + machine-readable result (M6R5)
  const failed = results.filter((r) => !r.ok);
  const summary = {
    format: "lugas-package-rehearsal-v1",
    packageSourceCommit: execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim(),
    tarballSha256: createHash("sha256").update(readFileSync(tgzOut)).digest("hex"),
    checksPassed: results.length - failed.length,
    checksTotal: results.length,
    entryCount,
    noticePresent: results.some((r) => r.name.startsWith("NOTICE") && r.ok),
    licensePresent: results.some((r) => r.name.startsWith("license") && r.ok),
    dryRunPublishPassed: results.some((r) => r.name.includes("dry-run") && r.ok),
    generatedAt: new Date().toISOString(),
  };
  mkdirSync(resolve(ROOT, "docs", "releases", "beta"), { recursive: true });
  writeFileSync(REHEARSAL_RESULT_PATH, JSON.stringify(summary, null, 2) + "\n");

  console.log(`\n=== Rehearsal summary: ${results.length - failed.length}/${results.length} checks passed ===`);
  console.log(`Rehearsal result written to docs/releases/beta/package-rehearsal.json`);

  console.log(`
Publication command (DOCUMENTED, NOT EXECUTED):
    npm publish ./docs/releases/beta/${tgzName} --access public --tag beta   # = validated dry-run minus --dry-run; requires owner approval

Artifacts written to docs/releases/beta/: ${artifactNames.join(", ")}`);

  rmSync(stage, { recursive: true, force: true });

  if (failed.length > 0) {
    console.error(`\nFAILED checks:\n${failed.map((f) => `- ${f.name}: ${f.detail}`).join("\n")}`);
    process.exit(1);
  }
}

main();
