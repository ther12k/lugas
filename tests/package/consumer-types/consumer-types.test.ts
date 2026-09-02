/**
 * Installed-tarball TypeScript consumer test (M6R7).
 *
 * The in-repo type tests import `src/` directly and bypass the package
 * boundary; the release rehearsal's consumer exercised a fixed contract
 * without generics. Together those gaps let the README's `AppContract`
 * example break unseen (issue #314 finding 1). This test stages the package
 * the same way the release pipeline does (copy + pack), installs the tarball
 * into a throwaway consumer project, and compiles the README's typed-client
 * example with `tsc --noEmit`. A negative control proves the harness can
 * fail, including on unknown client paths (finding 4).
 */
import { afterAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const TSC = join(ROOT, "node_modules", "typescript", "bin", "tsc");

let stageDir: string | undefined;
let consumerDir: string | undefined;

afterAll(() => {
  for (const dir of [stageDir, consumerDir]) {
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

function runInWorktreeArgs(args: string[], cwd: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
}

function tsc(configPath: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [TSC, "-p", configPath], { encoding: "utf8" });
}

test("README typed-client example compiles against the installed tarball", () => {
  // Stage 1: package staging copy, mirroring scripts/release/package-beta.ts.
  stageDir = mkdtempSync(join(tmpdir(), "lugas-consumer-stage-"));
  const stageSrc = join(stageDir, "src");
  cpSync(join(ROOT, "src"), stageSrc, { recursive: true });
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

  // Stage 2: throwaway consumer project installing the packed tarball.
  consumerDir = mkdtempSync(join(tmpdir(), "lugas-consumer-pkg-"));
  writeFileSync(
    join(consumerDir, "package.json"),
    `${JSON.stringify({ name: "lugas-consumer", private: true, type: "module" })}\n`,
  );
  const install = runInWorktreeArgs(["add", join(stageDir, tgzName)], consumerDir);
  expect(install.status).toBe(0);

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

