/**
 * CLI app module loader (M4-011).
 *
 * Implements the safe-import contract from M4-010: spawn a subprocess with
 * a bounded timeout, dynamically import the target module, extract the
 * Lugas app instance (default or named `app` export), and serialize the
 * manifest to JSON. Never imports user modules in-process.
 *
 * Exit codes:
 *   0 = manifest produced
 *   1 = import error (module threw)
 *   2 = timeout/hang
 *   3 = no Lugas app exported
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const DEFAULT_TIMEOUT_MS = 5_000;

export type LoadAppOptions = {
  readonly timeoutMs: number | undefined;
};

export type LoadAppResult =
  | { readonly ok: true; readonly manifestJson: string }
  | { readonly ok: false; readonly exitCode: 1 | 2 | 3; readonly message: string };

const CHILD_SCRIPT = `
const target = process.argv[2];
if (!target) { process.stderr.write("missing target"); process.exit(1); }
import(target).then((mod) => {
  const app = mod.default ?? mod.app;
  if (!app || typeof app.manifest === "undefined") {
    process.stderr.write("no Lugas app exported");
    process.exit(3);
  }
  process.stdout.write(JSON.stringify(app.manifest, null, 2));
}).catch((err) => {
  process.stderr.write(String(err?.message ?? err));
  process.exit(1);
});
`;

/**
 * Loads an app module in a subprocess and returns its serialized manifest.
 */
export function loadAppManifest(
  entryPath: string,
  options?: LoadAppOptions,
): LoadAppResult {
  const timeout = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const resolvedPath = resolve(entryPath);

  const dir = mkdtempSync(join(tmpdir(), "lugas-cli-"));
  const scriptPath = join(dir, "load-child.ts");
  writeFileSync(scriptPath, CHILD_SCRIPT);

  try {
    const proc = Bun.spawnSync(
      [process.execPath, "run", scriptPath, resolvedPath],
      {
        cwd: process.cwd(),
        timeout,
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env },
      },
    );

    // M6R1-007: Bun reports timeout via exitedDueToTimeout — the contract
    // source of truth, replacing the signal/exit-code heuristic.
    const timedOut = proc.exitedDueToTimeout === true;
    const stdout = new TextDecoder().decode(proc.stdout).trim();
    const stderr = new TextDecoder().decode(proc.stderr).trim();

    if (timedOut) {
      return { ok: false, exitCode: 2, message: `app module timed out after ${timeout}ms — possible server start or hanging timer` };
    }
    if (proc.exitCode === 3) {
      return { ok: false, exitCode: 3, message: stderr || "no Lugas app exported" };
    }
    if (proc.exitCode !== 0) {
      return { ok: false, exitCode: 1, message: stderr || "unknown import failure" };
    }

    try {
      const parsed = JSON.parse(stdout) as Record<string, unknown>;
      if (parsed.format === "lugas-manifest-v1" && Array.isArray(parsed.routes)) {
        return { ok: true, manifestJson: stdout };
      }
      return { ok: false, exitCode: 3, message: "module does not export a Lugas manifest" };
    } catch {
      return { ok: false, exitCode: 1, message: "child produced invalid JSON" };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
