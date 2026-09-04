/**
 * Installed-tarball TypeScript consumer test (M6R7, extended M6R14-ATT).
 *
 * The in-repo type tests import `src/` directly and bypass the package
 * boundary; the release rehearsal's consumer exercised a fixed contract
 * without generics. Together those gaps let the README's `AppContract`
 * example break unseen (issue #314 finding 1). This test stages the package
 * the same way the release pipeline does (copy + pack), installs the tarball
 * into a throwaway consumer project, and compiles the README's typed-client
 * example with `tsc --noEmit`. A negative control proves the harness can
 * fail, including on unknown client paths (finding 4).
 *
 * The M6R14-ATT extension compiles the REAL README snippet fixtures
 * (tests/docs/fixtures/, the verbatim drift-guarded quick-start flow) from
 * the installed tarball, so the publication checklist item
 * "installed-tarball README/type fixtures compile" is demonstrated against
 * the exact package bytes, not an in-repo self-reference.
 */
import { afterAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const TSC = join(ROOT, "node_modules", "typescript", "bin", "tsc");

const cleanupDirs: string[] = [];

afterAll(() => {
  for (const dir of cleanupDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function runInWorktreeArgs(args: string[], cwd: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
}

function tsc(configPath: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [TSC, "-p", configPath], { encoding: "utf8" });
}

const baseCompilerOptions = {
  target: "esnext",
  module: "esnext",
  moduleResolution: "bundler",
  lib: ["esnext"],
  types: ["bun"],
  typeRoots: [join(ROOT, "node_modules", "@types")],
  strict: true,
  exactOptionalPropertyTypes: true,
  verbatimModuleSyntax: true,
  isolatedModules: true,
  skipLibCheck: true,
  noEmit: true,
};

/**
 * Stages a workspace package-boundary fixture (src + package metadata,
 * packed with `bun pm pack`) and installs that tarball into a throwaway
 * consumer project. This is deliberately NOT the release staging path —
 * scripts/release/package-beta.ts stages from a git archive, sets the beta
 * version, and packs with `npm pack --json`; verifying the README fixtures
 * against that exact checksummed release tarball is a separate M6R14-ATT
 * review step performed once the artifact set exists.
 */
function stageAndInstall(): { stageDir: string; consumerDir: string } {
  const stageDir = mkdtempSync(join(tmpdir(), "lugas-consumer-stage-"));
  cleanupDirs.push(stageDir);
  cpSync(join(ROOT, "src"), join(stageDir, "src"), { recursive: true });
  for (const entry of ["package.json", "README.md", "NOTICE", "AGENTS.md"]) {
    cpSync(join(ROOT, entry), join(stageDir, entry));
  }
  cpSync(join(ROOT, "docs", "okf"), join(stageDir, "docs", "okf"), { recursive: true });

  const stagePkg = JSON.parse(readFileSync(join(stageDir, "package.json"), "utf8")) as {
    name: string;
    version: string;
  };
  const pack = runInWorktreeArgs(["pm", "pack"], stageDir);
  const tgzName = `${stagePkg.name}-${stagePkg.version}.tgz`;
  expect(existsSync(join(stageDir, tgzName))).toBe(true);
  expect(pack.stderr).toBe("");

  const consumerDir = mkdtempSync(join(tmpdir(), "lugas-consumer-pkg-"));
  cleanupDirs.push(consumerDir);
  writeFileSync(
    join(consumerDir, "package.json"),
    `${JSON.stringify({ name: "lugas-consumer", private: true, type: "module" })}\n`,
  );
  const install = runInWorktreeArgs(["add", join(stageDir, tgzName)], consumerDir);
  expect(install.status).toBe(0);
  return { stageDir, consumerDir };
}

test("README typed-client example compiles against the installed tarball", () => {
  const { consumerDir } = stageAndInstall();

  // Stage 3: the README's typed-client example, verbatim in shape.
  writeFileSync(
    join(consumerDir, "consumer.ts"),
    `import { defineApp, defineModule, json, route } from "lugas";
import { createClient } from "lugas/client";
import type { AppContract } from "lugas";

const hello = defineModule({
  name: "hello",
  routes: {
    "/hello": {
      GET: route({ handler: () => json(200, { hello: "world" }) }),
    },
  },
});

const app = defineApp({ modules: [hello] });
export default app;

const client = createClient<AppContract<typeof app>>({ baseUrl: "https://api.example.com" });

export async function main(): Promise<string> {
  const result = await client.get("/hello");
  if (result.ok) {
    const greeting: string = result.data.hello;
    return greeting;
  }
  return \`request failed with status \${result.status}\`;
}
`,
  );

  writeFileSync(
    join(consumerDir, "tsconfig.json"),
    JSON.stringify({ compilerOptions: baseCompilerOptions, include: ["consumer.ts"] }, null, 2),
  );

  const positive = tsc(join(consumerDir, "tsconfig.json"));
  expect(
    positive.status === 0
      ? { status: 0 }
      : { status: positive.status, output: `${positive.stdout}\n${positive.stderr}` },
  ).toEqual({ status: 0 });

  // Stage 4: negative control — must fail on the payload type AND on an
  // unknown client path (module-app path restriction, finding 4).
  writeFileSync(
    join(consumerDir, "negative.ts"),
    `import { createClient } from "lugas/client";
import type { AppContract } from "lugas";
import app from "./consumer";

const client = createClient<AppContract<typeof app>>({ baseUrl: "https://api.example.com" });

export async function bad(): Promise<string> {
  const result = await client.get("/hello");
  if (result.ok) {
    const broken: number = result.data.hello;
    return broken;
  }
  const unknownPath = await client.get("/does-not-exist");
  return \`unreachable \${unknownPath.status}\`;
}
`,
  );
  writeFileSync(
    join(consumerDir, "tsconfig.negative.json"),
    JSON.stringify(
      { compilerOptions: baseCompilerOptions, include: ["consumer.ts", "negative.ts"] },
      null,
      2,
    ),
  );

  const negative = tsc(join(consumerDir, "tsconfig.negative.json"));
  const negativeOutput = `${negative.stdout}\n${negative.stderr}`;
  expect(negative.status).not.toBe(0);
  expect(negativeOutput).toContain("error TS2322");
  expect(negativeOutput).toMatch(/\/does-not-exist/);
});

test("README snippet fixtures compile against the installed tarball", () => {
  const { consumerDir } = stageAndInstall();

  // Copy the real verbatim README fixtures (guarded against drift by
  // tests/docs/readme-snippets.test.ts) into the consumer project.
  const fixturesRoot = join(ROOT, "tests", "docs", "fixtures");
  const fixtureFiles: string[] = [];
  const visit = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) visit(join(dir, entry.name), childRel);
      else if (entry.isFile() && entry.name.endsWith(".ts")) fixtureFiles.push(childRel);
    }
  };
  visit(fixturesRoot, "");
  expect(fixtureFiles.length).toBeGreaterThanOrEqual(4);

  for (const rel of fixtureFiles) {
    const dest = join(consumerDir, "fixtures", ...rel.split("/"));
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(fixturesRoot, ...rel.split("/")), dest);
  }

  // readme-invoices/app.ts imports zod; give the consumer the same spec as
  // the repository toolchain.
  const zodSpec = (
    JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      devDependencies: Record<string, string>;
    }
  ).devDependencies["zod"];
  expect(zodSpec).toBeDefined();
  const zodInstall = runInWorktreeArgs(["add", `zod@${zodSpec}`], consumerDir);
  expect(zodInstall.status).toBe(0);

  writeFileSync(
    join(consumerDir, "tsconfig.fixtures.json"),
    JSON.stringify({ compilerOptions: baseCompilerOptions, include: ["fixtures/**/*.ts"] }, null, 2),
  );
  const result = tsc(join(consumerDir, "tsconfig.fixtures.json"));
  expect(
    result.status === 0
      ? { status: 0 }
      : { status: result.status, output: `${result.stdout}\n${result.stderr}` },
  ).toEqual({ status: 0 });
});
