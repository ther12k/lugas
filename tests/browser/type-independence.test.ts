/**
 * M7-005 type-checking independence (ADR-0021 §4).
 *
 * An independently configured plain-JavaScript consumer using `checkJs`
 * receives useful static checking against the installed tarball, with no
 * repository tsconfig participating. `.ts` sources remain the only type
 * source of truth — the browser artifact ships no declarations fork.
 * npm-gated like the other packed-consumer suites.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { npmAvailable } from "./installed-artifact";

const ROOT = resolve(import.meta.dir, "../..");
const TSC = join(ROOT, "node_modules", "typescript", "bin", "tsc");
const cleanupDirs: string[] = [];

afterAll(() => {
  for (const dir of cleanupDirs) rmSync(dir, { recursive: true, force: true });
});

function stageAndInstall(): string {
  const stage = mkdtempSync(join(tmpdir(), "lugas-m7005-ts-stage-"));
  cleanupDirs.push(stage);
  const stagePkg = join(stage, "package");
  mkdirSync(stagePkg, { recursive: true });
  cpSync(join(ROOT, "src"), join(stagePkg, "src"), { recursive: true });
  for (const entry of ["package.json", "README.md", "NOTICE", "AGENTS.md"]) {
    cpSync(join(ROOT, entry), join(stagePkg, entry));
  }
  const pkgPath = join(stagePkg, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string; private?: boolean };
  pkg.version = "0.1.0-beta.1";
  delete pkg.private;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  const tgzName = `lugas-0.1.0-beta.1.tgz`;
  const pack = Bun.spawnSync(["bun", "pm", "pack"], { cwd: stagePkg, stdout: "pipe", stderr: "pipe" });
  if (pack.exitCode !== 0 || !existsSync(join(stagePkg, tgzName))) {
    throw new Error(`staging pack failed: ${new TextDecoder().decode(pack.stderr)}`);
  }
  const consumerDir = mkdtempSync(join(tmpdir(), "lugas-m7005-ts-consumer-"));
  cleanupDirs.push(consumerDir);
  writeFileSync(
    join(consumerDir, "package.json"),
    `${JSON.stringify({ name: "lugas-m7005-ts-consumer", private: true, type: "module" })}\n`,
  );
  const install = Bun.spawnSync(["bun", "add", "--no-save", join(stagePkg, tgzName)], { cwd: consumerDir, stdout: "pipe", stderr: "pipe" });
  if (install.exitCode !== 0) {
    throw new Error(`consumer install failed: ${new TextDecoder().decode(install.stderr)}`);
  }
  return consumerDir;
}

function tsc(consumerDir: string, config: string): { status: number; output: string } {
  const result = Bun.spawnSync([process.execPath, TSC, "-p", join(consumerDir, config)], { cwd: consumerDir, stdout: "pipe", stderr: "pipe" });
  return {
    status: result.exitCode,
    output: `${new TextDecoder().decode(result.stdout)}\n${new TextDecoder().decode(result.stderr)}`,
  };
}

// The consumer's OWN tsconfig — the repository tsconfig never participates.
const CHECKJS_CONFIG = {
  compilerOptions: {
    target: "esnext",
    module: "esnext",
    moduleResolution: "bundler",
    lib: ["esnext"],
    allowJs: true,
    checkJs: true,
    strict: true,
    noEmit: true,
  },
  include: ["consumer.js", "negative.js"],
};

describe.skipIf(!npmAvailable())("M7-005 type-checking independence", () => {
  test("plain-JS consumer with @ts-check type-checks against the installed package", () => {
    const consumerDir = stageAndInstall();
    // The installed package ships .ts sources that reference the `Bun`
    // namespace; an independent frontend pins its own Bun types — mirrored
    // here from the repository toolchain to keep the fixture offline.
    // @types/bun is a thin wrapper that re-exports the bun-types package,
    // so both directories are required.
    mkdirSync(join(consumerDir, "node_modules", "@types"), { recursive: true });
    cpSync(join(ROOT, "node_modules", "@types", "bun"), join(consumerDir, "node_modules", "@types", "bun"), { recursive: true });
    cpSync(join(ROOT, "node_modules", "bun-types"), join(consumerDir, "node_modules", "bun-types"), { recursive: true });
    cpSync(join(ROOT, "node_modules", "@types", "node"), join(consumerDir, "node_modules", "@types", "node"), { recursive: true });
    cpSync(join(ROOT, "node_modules", "undici-types"), join(consumerDir, "node_modules", "undici-types"), { recursive: true });
    writeFileSync(
      join(consumerDir, "consumer.js"),
      `// @ts-check
import { createClient } from "lugas/client";
import { defineApp, json, route } from "lugas";

const app = defineApp({
  routes: {
    "/hello": {
      GET: route({ handler: () => json(200, { hello: "world" }) }),
    },
  },
});

/** @typedef {import("lugas").AppContract<typeof app>} API */

const client = /** @type {import("lugas/client").LugasClient<API>} */ (createClient({ baseUrl: "https://api.example.com" }));

/**
 * @returns {Promise<string>}
 */
export async function main() {
  const result = await client.get("/hello");
  if (result.ok) {
    /** @type {string} */
    const greeting = result.data.hello;
    return greeting;
  }
  return "failed " + result.status;
}
`,
    );
    const config = {
      compilerOptions: {
        ...CHECKJS_CONFIG.compilerOptions,
        types: ["bun"],
        typeRoots: ["node_modules/@types"],
      },
      include: CHECKJS_CONFIG.include,
    };
    writeFileSync(join(consumerDir, "tsconfig.json"), JSON.stringify(config, null, 2));
    const positive = tsc(consumerDir, "tsconfig.json");
    expect(
      positive.status === 0 ? { status: 0 } : { status: positive.status, output: positive.output },
    ).toEqual({ status: 0 });
  });

  test("checkJs harness honesty: a deliberate type error fails the check", () => {
    const consumerDir = stageAndInstall();
    mkdirSync(join(consumerDir, "node_modules", "@types"), { recursive: true });
    cpSync(join(ROOT, "node_modules", "@types", "bun"), join(consumerDir, "node_modules", "@types", "bun"), { recursive: true });
    cpSync(join(ROOT, "node_modules", "bun-types"), join(consumerDir, "node_modules", "bun-types"), { recursive: true });
    cpSync(join(ROOT, "node_modules", "@types", "node"), join(consumerDir, "node_modules", "@types", "node"), { recursive: true });
    cpSync(join(ROOT, "node_modules", "undici-types"), join(consumerDir, "node_modules", "undici-types"), { recursive: true });
    writeFileSync(
      join(consumerDir, "consumer.js"),
      `// @ts-check
import { createClient } from "lugas/client";

export async function main() {
  const client = createClient({ baseUrl: "https://api.example.com" });
  await client.get("/anything");
}
`,
    );
    writeFileSync(
      join(consumerDir, "negative.js"),
      `// @ts-check
/** @type {number} */
export const notANumber = "this is a string";
`,
    );
    const config = {
      compilerOptions: {
        ...CHECKJS_CONFIG.compilerOptions,
        types: ["bun"],
        typeRoots: ["node_modules/@types"],
      },
      include: CHECKJS_CONFIG.include,
    };
    writeFileSync(join(consumerDir, "tsconfig.json"), JSON.stringify(config, null, 2));
    const negative = tsc(consumerDir, "tsconfig.json");
    expect(negative.status).not.toBe(0);
    expect(negative.output).toContain("error TS2322");
  });
});
