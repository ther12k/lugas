/**
 * Release-staged installed-package consumer evidence (#447).
 *
 * The CA-20 suite pins dual-distribution resolution and runtime identity,
 * and the M6R7 consumer-types suite compiles fixtures — but against a
 * `bun pm pack` staging with the repository's own tsc and @types (its own
 * design note defers the release tarball). This suite closes the #447 gaps
 * against the RELEASE-staged tarball (same staging path as the rehearsal):
 *
 * 1. Clean-room typecheck — the consumer installs its OWN typescript,
 *    @types/bun and zod from the registry (no checkout leakage), compiles
 *    positive fixtures with the documented getting-started tsconfig, and a
 *    negative fixture proves contract violations fail compilation.
 * 2. Browser-safety scan — the bundled client output AND the prebuilt
 *    artifact must contain no bun:/node: server-runtime or framework
 *    dependency specifiers.
 * 3. Resolution containment — every declared subpath resolves inside the
 *    consumer's node_modules/lugas in both modes, never the checkout; the
 *    manifest framework version equals the installed package metadata
 *    version in both modes.
 *
 * Skips cleanly when npm is unavailable (documented, not silently passed).
 */
import { describe, expect, test } from "bun:test";
import { execSync, spawnSync } from "node:child_process";
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
import { CANDIDATE_VERSION } from "../../../scripts/release/candidate-version";

const ROOT = resolve(import.meta.dir, "../../..");

/** Exact dev-tool specs the documented typecheck setup needs (recorded in evidence). */
const CONSUMER_DEV_TOOLS = {
  typescript: "7.0.2",
  "@types/bun": "1.4.0",
} as const;
const CONSUMER_ZOD_SPEC = (
  JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    devDependencies: Record<string, string>;
  }
).devDependencies["zod"];

interface Staged {
  stage: string;
  stagePkg: string;
  tgzPath: string;
}

async function stageReleaseTarball(): Promise<Staged | null> {
  const probe = Bun.spawnSync(["npm", "--version"], { stdout: "pipe", stderr: "pipe" });
  if (probe.exitCode !== 0) return null;

  const stage = mkdtempSync(join(tmpdir(), "lugas-447-stage-"));
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
    return { stage, stagePkg, tgzPath: join(stagePkg, parsed[0]!.filename) };
  } catch {
    rmSync(stage, { recursive: true, force: true });
    return null;
  }
}

function installConsumer(stage: string, name: string, tgzPath: string, extraArgs = ""): string {
  const dir = join(stage, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name, private: true, type: "module" }, null, 2),
  );
  execSync(`bun install --no-save ${JSON.stringify(tgzPath)} ${extraArgs}`, { cwd: dir, stdio: "pipe", maxBuffer: 64 * 1024 * 1024 });
  return dir;
}

function run(cmd: string, cwd: string): { code: number; out: string } {
  const proc = Bun.spawnSync(["bash", "-c", cmd], { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    code: proc.exitCode,
    out: `${new TextDecoder().decode(proc.stdout).trim()}\n${new TextDecoder().decode(proc.stderr).trim()}`.trim(),
  };
}

function npmAvailable(): boolean {
  if (Bun.which("npm") === null) return false;
  const probe = Bun.spawnSync(["npm", "--version"], { stdout: "pipe", stderr: "pipe" });
  return probe.exitCode === 0 && new TextDecoder().decode(probe.stdout).trim() !== "";
}

/** The documented getting-started consumer tsconfig, verbatim in substance. */
function consumerTsconfig(include: string[]): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        types: ["@types/bun"],
        lib: ["esnext"],
        strict: true,
        noEmit: true,
        skipLibCheck: true,
      },
      include,
    },
    null,
    2,
  );
}

/** A server contract with params/query/headers/body slots plus the typed-client calls over it. */
const POSITIVE_APP = `import { defineApp, route, json } from "lugas";
import { z } from "zod";

const app = defineApp({
  routes: {
    "/users": {
      GET: route({
        query: z.object({ page: z.coerce.number().int().min(1) }),
        handler: (ctx) => json(200, { page: ctx.query.page, users: [] }),
      }),
      POST: route({
        body: z.object({ name: z.string() }),
        handler: (ctx) => json(201, { created: ctx.body.name }),
      }),
    },
    "/users/:id": {
      GET: route({
        headers: z.object({ cookie: z.string().optional() }),
        handler: (ctx) => json(200, { id: ctx.params.id }),
      }),
    },
  },
});
export default app;
`;

const POSITIVE_CLIENT = `import { createClient } from "lugas/client";
import type { AppContract } from "lugas";
import type app from "./app";

const api = createClient<AppContract<typeof app>>({ baseUrl: "https://api.example.com" });

export async function main(): Promise<string> {
  const listed = await api.get("/users", { query: { page: 2 } });
  if (listed.ok) {
    // Wire-honest: a coerced query number can be NaN, so the result type is number | null.
    const page: number | null = listed.data.page;
    if (page !== null) return \`page \${page}\`;
  }
  const created = await api.post("/users", { body: { name: "ada" } });
  if (created.ok) {
    const name: string = created.data.created;
    return name;
  }
  const one = await api.get("/users/:id", { params: { id: "u1" }, headers: {} });
  if (one.ok) {
    const id: string = one.data.id;
    return id;
  }
  return "unreachable";
}
`;

const NEGATIVE_CLIENT = `import { createClient } from "lugas/client";
import type { AppContract } from "lugas";
import type app from "./app";

const api = createClient<AppContract<typeof app>>({ baseUrl: "https://api.example.com" });

export async function bad(): Promise<string> {
  const unknownPath = await api.get("/does-not-exist");
  const wrongBody = await api.post("/users", { body: { name: 42 } });
  const forbiddenMethod = api.delete("/users/:id", { params: { id: "u1" } });
  return \`unreachable \${unknownPath.status} \${wrongBody.status} \${forbiddenMethod.status}\`;
}
`;

describe.skipIf(!npmAvailable())("release-staged installed consumers (#447)", () => {
  test(
    "clean-room typecheck: consumer-installed toolchain compiles the documented contract, violations fail",
    async () => {
      const staged = await stageReleaseTarball();
      if (!staged) throw new Error("stage failed (npm unavailable?)");
      const { stage, tgzPath } = staged;
      try {
        const dir = installConsumer(
          stage,
          "t-typecheck",
          tgzPath,
          `typescript@${CONSUMER_DEV_TOOLS.typescript} @types/bun@${CONSUMER_DEV_TOOLS["@types/bun"]} zod@${CONSUMER_ZOD_SPEC}`,
        );
        expect(dir.startsWith(ROOT)).toBe(false);

        writeFileSync(join(dir, "app.ts"), POSITIVE_APP);
        writeFileSync(join(dir, "client.ts"), POSITIVE_CLIENT);
        writeFileSync(join(dir, "tsconfig.json"), consumerTsconfig(["app.ts", "client.ts"]));
        const tsc = join(dir, "node_modules", "typescript", "bin", "tsc");
        expect(existsSync(tsc)).toBe(true);
        const positive = spawnSync(process.execPath, [tsc, "-p", join(dir, "tsconfig.json")], { encoding: "utf8" });
        expect(
          positive.status === 0
            ? { status: 0 }
            : { status: positive.status, output: `${positive.stdout}\n${positive.stderr}` },
        ).toEqual({ status: 0 });

        // Negative control: unknown path, wrong body type, and a method the
        // route map does not declare must ALL fail compilation. The pinned
        // diagnostics are the ones observed with the consumer-installed
        // toolchain (TypeScript 7): the unknown path fails on argument arity
        // (the route map makes that path `never`), the wrong body on the
        // payload type, the undeclared method on the path argument. The
        // cascading TS2339 on line 11 is not pinned separately.
        writeFileSync(join(dir, "negative.ts"), NEGATIVE_CLIENT);
        writeFileSync(join(dir, "tsconfig.negative.json"), consumerTsconfig(["app.ts", "client.ts", "negative.ts"]));
        const negative = spawnSync(process.execPath, [tsc, "-p", join(dir, "tsconfig.negative.json")], { encoding: "utf8" });
        const output = `${negative.stdout}\n${negative.stderr}`;
        expect(negative.status).not.toBe(0);
        expect(output).toContain("error TS2322");
        expect(output).toMatch(/negative\.ts\(8,\d+\): error TS/);
        expect(output).toContain("error TS2345");
      } finally {
        rmSync(stage, { recursive: true, force: true });
      }
    },
    240_000,
  );

  test(
    "browser bundle and prebuilt artifact carry no server-runtime or dependency specifiers",
    async () => {
      const staged = await stageReleaseTarball();
      if (!staged) throw new Error("stage failed (npm unavailable?)");
      const { stage, tgzPath } = staged;
      try {
        const dir = installConsumer(stage, "t-browser", tgzPath);
        writeFileSync(
          join(dir, "entry.ts"),
          `import { createClient } from "lugas/client";
const c = createClient({ baseUrl: "https://x.test" });
if (typeof c.get !== "function") throw new Error("bad client");
console.log("BROWSER-ENTRY-OK");`,
        );
        const outDir = join(dir, "dist");
        const bundle = await Bun.build({ entrypoints: [join(dir, "entry.ts")], target: "browser", outdir: outDir });
        expect(bundle.success).toBe(true);
        const js = readdirSync(outDir).find((f) => f.endsWith(".js"));
        expect(js).toBeDefined();

        // A quoted bun:/node: module specifier or a bare framework-dependency
        // specifier means server/runtime coupling reached the browser output.
        const forbidden = /["'](bun|node):[^"']*["']|["'](drizzle-orm|zod)["']/;
        const bundled = readFileSync(join(outDir, js!), "utf8");
        expect(forbidden.test(bundled)).toBe(false);
        const prebuilt = readFileSync(join(dir, "node_modules", "lugas", "build", "lugas-client.esm.js"), "utf8");
        expect(forbidden.test(prebuilt)).toBe(false);

        // And the bundle still runs under Node with only a fetch stub.
        const smoke = Bun.spawnSync(
          ["node", "-e", `globalThis.fetch=async()=>new Response('{}');import('./dist/${js}').then(()=>console.log('NODE-RUN-OK')).catch(e=>{console.error(e);process.exit(1)})`],
          { cwd: dir, stdout: "pipe", stderr: "pipe" },
        );
        expect(new TextDecoder().decode(smoke.stdout)).toContain("NODE-RUN-OK");
        expect(smoke.exitCode).toBe(0);
      } finally {
        rmSync(stage, { recursive: true, force: true });
      }
    },
    240_000,
  );

  test(
    "every declared subpath resolves inside the installed package in both modes; manifest equals installed metadata",
    async () => {
      const staged = await stageReleaseTarball();
      if (!staged) throw new Error("stage failed (npm unavailable?)");
      const { stage, tgzPath } = staged;
      try {
        const dir = installConsumer(stage, "t-resolution", tgzPath);
        const installedRoot = join(dir, "node_modules", "lugas");
        const installedPkg = JSON.parse(readFileSync(join(installedRoot, "package.json"), "utf8")) as { version: string };
        expect(installedPkg.version).toBe(CANDIDATE_VERSION);

        const modes = [
          { label: "default (bun condition)", flags: "", expectTree: "src", expectExt: ".ts" },
          { label: "lugas-dist", flags: "--conditions=lugas-dist", expectTree: "dist", expectExt: ".js" },
        ] as const;
        const subpaths = ["lugas", "lugas/client", "lugas/drizzle", "lugas/testing"] as const;
        for (const mode of modes) {
          for (const specifier of subpaths) {
            const resolved = run(
              `bun ${mode.flags} -e 'console.log(Bun.resolveSync(${JSON.stringify(specifier)}, process.cwd()))'`,
              dir,
            );
            if (resolved.code !== 0) console.error(`resolve probe failed [${mode.label}] ${specifier}: ${resolved.out}`);
            expect(resolved.code).toBe(0);
            const path = resolved.out.split("\n")[0]!.trim();
            // Containment: inside THIS consumer's install, never the checkout.
            expect(path.startsWith(installedRoot + "/")).toBe(true);
            expect(path.startsWith(ROOT)).toBe(false);
            expect(path).toContain(`/${mode.expectTree}/`);
            expect(path.endsWith(mode.expectExt)).toBe(true);
          }
          // The prebuilt artifact is mode-independent by design.
          const browser = run(
            `bun ${mode.flags} -e 'console.log(Bun.resolveSync("lugas/client/browser", process.cwd()))'`,
            dir,
          );
          expect(browser.out.split("\n")[0]!.trim().endsWith("build/lugas-client.esm.js")).toBe(true);
          // Non-Bun tooling falls back to dist regardless of mode.
          const nodeResolved = run('node -e "console.log(require.resolve(\'lugas\'))"', dir);
          expect(nodeResolved.code).toBe(0);
          const nodePath = nodeResolved.out.split("\n")[0]!.trim();
          expect(nodePath.startsWith(installedRoot + "/")).toBe(true);
          expect(nodePath.endsWith("dist/index.js")).toBe(true);
        }

        // One version identity: the manifest the app reports equals the
        // INSTALLED package metadata (not just the candidate constant) in
        // both modes.
        writeFileSync(
          join(dir, "app.ts"),
          `import { defineApp, route, json } from "lugas";
const app = defineApp({ routes: { "/ping": { GET: route({ handler: () => json(200, { pong: true }) }) } } });
console.log("IDENTITY-OK fw=" + app.manifest.frameworkVersion);`,
        );
        for (const mode of modes) {
          const ran = run(`bun ${mode.flags} run app.ts`, dir);
          expect(ran.code).toBe(0);
          expect(ran.out).toContain(`IDENTITY-OK fw=${installedPkg.version}`);
        }
      } finally {
        rmSync(stage, { recursive: true, force: true });
      }
    },
    240_000,
  );
});
