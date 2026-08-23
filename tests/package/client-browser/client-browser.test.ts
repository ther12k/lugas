import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CLIENT_ROOT = resolve(import.meta.dir, "../../../src/client");
const FIXTURE = resolve(import.meta.dir, "browser-fixture.ts");
const WRAPPER = resolve(import.meta.dir, "smoke-wrapper.mjs");
const NODE = "node";

async function bundleBrowser(
  entry: string,
): Promise<{ outDir: string; entryPoint: string | undefined }> {
  const outDir = mkdtempSync(join(tmpdir(), "lugas-client-bundle-"));
  const result = await Bun.build({
    entrypoints: [entry],
    target: "browser",
    outdir: outDir,
    naming: "[name].[ext]",
  });
  if (!result.success) {
    throw new Error(`bundle failed: ${result.logs.map(String).join("\n")}`);
  }
  return {
    outDir,
    entryPoint: result.outputs.find((o) => o.kind === "entry-point")?.path,
  };
}

function readBundleText(outDir: string): string {
  return readdirSync(outDir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => readFileSync(join(outDir, f), "utf8"))
    .join("\n");
}

describe("client browser-safety proof", () => {
  test("bundle contains no Bun/server/CLI edges", async () => {
    const { outDir } = await bundleBrowser(FIXTURE);
    const text = readBundleText(outDir);
    const forbidden = [
      /src\/core\/app/,
      /from\s*["']bun["']/,
      /require\(\s*["']bun["']\s*\)/,
      /node:[a-z]+/,
      /\bdefineApp\b/,
      /\bBun\./,
    ];
    for (const pattern of forbidden) {
      expect({ pattern: String(pattern), found: pattern.test(text) }).toEqual({
        pattern: String(pattern),
        found: false,
      });
    }
    rmSync(outDir, { recursive: true, force: true });
  });

  test("graph check passes: runtime imports never leave src/client", async () => {
    const proc = Bun.spawn([
      "bun",
      "run",
      resolve(import.meta.dir, "../../../scripts/check-client-graph.ts"),
    ]);
    const exit = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect({ exit, stderr }).toEqual({ exit: 0, stderr: "" });
  });

  test("bundle executes under standalone Node (no Bun global) against a fetch stub", async () => {
    const probe = Bun.spawnSync([NODE, "--version"], { stdout: "pipe" });
    if (!(probe.exitCode === 0 && new TextDecoder().decode(probe.stdout).trim() !== "")) {
      console.warn("[client-browser] node unavailable; execution smoke skipped");
      return;
    }
    const { outDir, entryPoint } = await bundleBrowser(FIXTURE);
    expect(entryPoint).toBeDefined();
    const proc = Bun.spawn([NODE, WRAPPER], {
      env: { ...process.env, SMOKE_BUNDLE_PATH: entryPoint! },
      stdout: "pipe",
      stderr: "pipe",
    });
    const exit = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    expect({ exit, stdout, stderr }).toEqual({
      exit: 0,
      stdout: "CLIENT-SMOKE-OK\n",
      stderr: "",
    });
    rmSync(outDir, { recursive: true, force: true });
  });

  test("tree shaking excludes unused surface where the build supports it", async () => {
    const full = await bundleBrowser(FIXTURE);
    const fullSize = readBundleText(full.outDir).length;

    const minimalOut = mkdtempSync(join(tmpdir(), "lugas-client-min-"));
    const minimalEntry = join(minimalOut, "minimal-entry.ts");
    writeFileSync(
      minimalEntry,
      `import { normalizeBaseUrl } from ${JSON.stringify(
        join(CLIENT_ROOT, "create-client.ts"),
      )};\nif (normalizeBaseUrl("https://x.test").origin !== "https://x.test") throw new Error("nope");\n`,
    );
    const minimal = await Bun.build({
      entrypoints: [minimalEntry],
      target: "browser",
      outdir: minimalOut,
      naming: "[name].[ext]",
    });
    if (!minimal.success) {
      throw new Error(`minimal bundle failed: ${minimal.logs.map(String).join("\n")}`);
    }
    const minimalSize = readBundleText(minimalOut).length;
    // Sizes are measured for the report, never marketed.
    console.log(`[client-bundle] full=${fullSize}B minimal(normalizeBaseUrl)=${minimalSize}B`);
    expect(minimalSize).toBeLessThan(fullSize);
    rmSync(full.outDir, { recursive: true, force: true });
    rmSync(minimalOut, { recursive: true, force: true });
  });
});
