/**
 * Packed consumer proof for the `lugas/client` subpath (M3-018).
 *
 * Verifies export-map resolution, subpath lockdown, browser bundling via the
 * bare specifier, root-independence at client runtime, and the npm dry-run
 * tarball contents. Deterministic; no registry access (pack is local).
 */
import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const HERE = import.meta.dir;
const ROOT = resolve(HERE, "../../..");
const TMP = join(HERE, ".tmp");

/**
 * Self-reference resolution anchors to the nearest package.json of the
 * IMPORTING FILE, so probes must live inside the package tree.
 */
function runBunScript(name: string, code: string): { code: number | null; stdout: string; stderr: string } {
  mkdirSync(TMP, { recursive: true });
  const file = join(TMP, name);
  writeFileSync(file, code);
  try {
    const proc = Bun.spawnSync([process.execPath, file], {
      cwd: ROOT,
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      code: proc.exitCode,
      stdout: new TextDecoder().decode(proc.stdout),
      stderr: new TextDecoder().decode(proc.stderr),
    };
  } finally {
    rmSync(file, { force: true });
  }
}

describe("lugas/client export surface", () => {
  test("bare specifier resolves under Bun and exposes createClient", () => {
    const out = runBunScript(
      "probe-selfref.ts",
      `import * as m from "lugas/client";
       if (typeof m.createClient !== "function") { console.error("missing createClient"); process.exit(1); }
       if (typeof m.ClientDecodeError !== "function") { console.error("missing ClientDecodeError"); process.exit(1); }
       console.log("EXPORT-OK");`,
    );
    expect({ code: out.code, stdout: out.stdout.trim(), stderr: out.stderr }).toEqual({
      code: 0,
      stdout: "EXPORT-OK",
      stderr: "",
    });
  });

  test("internal modules are locked down — no public subpaths", () => {
    const out = runBunScript(
      "probe-lockdown.ts",
      `try {
         await import("lugas/client/create-client");
         console.error("subpath leaked");
         process.exit(1);
       } catch {
         console.log("LOCKED-OK");
       }`,
    );
    expect(out.stdout.trim()).toBe("LOCKED-OK");
  });

  test("client runtime never pulls in the root server export", async () => {
    const m = await import("lugas/client");
    const keys = Object.keys(m).sort();
    // The public surface is client-only: no defineApp / route / guard leak.
    expect(keys).not.toContain("defineApp");
    expect(keys).toContain("createClient");
    expect(keys).toContain("parseResponse");
  });

  test("browser bundle resolves the bare lugas/client specifier", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "lugas-subpath-bundle-"));
    mkdirSync(TMP, { recursive: true });
    const entry = join(TMP, "bundle-entry.ts");
    writeFileSync(
      entry,
      `import { createClient } from "lugas/client";
       const c = createClient({ baseUrl: "https://x.test" });
       if (!c || typeof c.get !== "function") throw new Error("bad client");
       console.log("BUNDLE-SUBPATH-OK");`,
    );
    const result = await Bun.build({ entrypoints: [entry], target: "browser", outdir: outDir });
    if (!result.success) {
      throw new Error(`bundle failed: ${result.logs.map(String).join("\n")}`);
    }
    const text = readdirSync(outDir)
      .filter((f) => f.endsWith(".js"))
      .map((f) => readFileSync(join(outDir, f), "utf8"))
      .join("\n");
    expect(/src\/core\/app|defineApp|Bun\./.test(text)).toBe(false);

    const outputs = readdirSync(outDir);
    expect(outputs).toContain("bundle-entry.js");
    const smoke = Bun.spawnSync(["node", join(outDir, "bundle-entry.js")], {
      stdout: "pipe",
      stderr: "pipe",
    });
    expect({
      code: smoke.exitCode,
      stdout: new TextDecoder().decode(smoke.stdout).trim(),
      stderr: new TextDecoder().decode(smoke.stderr).trim(),
    }).toEqual({ code: 0, stdout: "BUNDLE-SUBPATH-OK", stderr: "" });
    rmSync(outDir, { recursive: true, force: true });
  });

  test("npm pack dry run contains declarations and no benchmark/worktree data", () => {
    let listing: string;
    try {
      listing = execSync("npm pack --dry-run --json", {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch (error) {
      const err = error as { stdout?: string };
      listing = err.stdout ?? "";
      if (listing === "") {
        console.warn("[client-export] npm unavailable; dry-run skipped");
        return;
      }
    }
    const parsed = JSON.parse(listing) as Array<{ files?: Array<{ path: string }> }>;
    const paths = (parsed[0]?.files ?? []).map((f) => f.path);
    expect(paths).toContain("src/client/index.ts");
    expect(paths).toContain("src/index.ts");
    for (const path of paths) {
      expect(path.startsWith("benchmarks/")).toBe(false);
      expect(path.startsWith(".worktrees/")).toBe(false);
      expect(path.startsWith("tests/type-performance/")).toBe(false);
    }
    const declaredClientModules = [
      "src/client/create-client.ts",
      "src/client/errors.ts",
      "src/client/index.ts",
      "src/client/parse-response.ts",
      "src/client/path.ts",
      "src/client/query.ts",
      "src/client/request.ts",
      "src/client/types.ts",
    ];
    for (const mod of declaredClientModules) {
      expect(paths).toContain(mod);
    }
    console.log(`[m3-package] tarball entries: ${paths.length}`);
  });
});
