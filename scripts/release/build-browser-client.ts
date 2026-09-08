/**
 * Browser-executable client artifact builder (M7-005 / ADR-0021).
 *
 * Compiles the public `lugas/client` surface into a single self-contained,
 * browser-target ESM file. The `.ts` sources remain the only type source of
 * truth (ADR-0012/0021): this artifact is runtime JavaScript only and carries
 * no declarations. Build inputs are the committed sources plus the pinned
 * Bun version — the same commit and toolchain produce the same bytes, which
 * the release rehearsal records as reproducibility evidence.
 *
 * CLI usage:  bun run scripts/release/build-browser-client.ts [outdir]
 * Default outdir is `<repo>/build`. Library usage imports
 * `buildBrowserClient()` (the release rehearsal builds directly into the
 * staged package copy so the packed tarball carries the artifact).
 */
import { mkdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
export const ARTIFACT_FILE_NAME = "lugas-client.esm.js";
export const ARTIFACT_PACKAGE_PATH = `build/${ARTIFACT_FILE_NAME}`;
const CLIENT_ENTRY = join(ROOT, "src", "client", "index.ts");

export type BrowserArtifact = {
  /** Absolute path of the built file. */
  readonly path: string;
  /** Size in bytes (recorded in inventory/SBOM evidence). */
  readonly bytes: number;
  /** sha256 of the artifact bytes. */
  readonly sha256: string;
};

export async function buildBrowserClient(outdir: string): Promise<BrowserArtifact> {
  const result = await Bun.build({
    entrypoints: [CLIENT_ENTRY],
    target: "browser",
    format: "esm",
    minify: false,
    naming: ARTIFACT_FILE_NAME,
    outdir,
  });
  if (!result.success) {
    throw new Error(`browser client build failed: ${result.logs.map(String).join("\n")}`);
  }
  const path = join(outdir, ARTIFACT_FILE_NAME);
  const bytes = statSync(path).size;
  const sha256 = createHash("sha256").update(new Uint8Array(await Bun.file(path).arrayBuffer())).digest("hex");
  return { path, bytes, sha256 };
}

import { createHash } from "node:crypto";

const isDirectRun = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.path);
if (isDirectRun) {
  const outdir = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, "build");
  mkdirSync(outdir, { recursive: true });
  const artifact = await buildBrowserClient(outdir);
  console.log(`browser client artifact: ${artifact.path}`);
  console.log(`bytes=${artifact.bytes} sha256=${artifact.sha256} bun=${Bun.version}`);
}
