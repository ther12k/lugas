/**
 * Intentional golden update command (M4-009).
 *
 * Ordinary tests NEVER write goldens. Regeneration happens only here and
 * only with --apply; without it the command prints what would change so a
 * human can review `git diff tests/golden` before committing.
 *
 * Usage:
 *   bun run scripts/update-goldens.ts            # preview
 *   bun run scripts/update-goldens.ts --apply    # rewrite fixtures
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCatalogGolden,
  buildManifestGolden,
  buildSampleGoldens,
  CATALOG_GOLDEN_PATH,
  MANIFEST_GOLDEN_PATH,
  SAMPLES_GOLDEN_PATH,
} from "../tests/golden/golden-sources";

const ROOT = resolve(import.meta.dir, "..");
const apply = process.argv.includes("--apply");

function current(rel: string): string | undefined {
  try {
    return readFileSync(resolve(ROOT, rel), "utf8");
  } catch {
    return undefined;
  }
}

const targets: Array<{ rel: string; next: string }> = [
  { rel: MANIFEST_GOLDEN_PATH, next: buildManifestGolden() },
  { rel: CATALOG_GOLDEN_PATH, next: `${JSON.stringify(buildCatalogGolden(), null, 2)}\n` },
  { rel: SAMPLES_GOLDEN_PATH, next: `${JSON.stringify(buildSampleGoldens(), null, 2)}\n` },
];

let changes = 0;
for (const { rel, next } of targets) {
  const prev = current(rel);
  if (prev === next) continue;
  changes++;
  if (apply) {
    mkdirSync(resolve(ROOT, rel, ".."), { recursive: true });
    writeFileSync(resolve(ROOT, rel), next);
    console.log(`updated ${rel}`);
  } else {
    console.log(`would update ${rel}`);
  }
}

if (changes === 0) {
  console.log("goldens up to date");
} else if (!apply) {
  console.log(`${changes} file(s) would change — review with 'git diff', then rerun with --apply`);
} else {
  console.log(
    `${changes} file(s) rewritten. Review 'git diff tests/golden' and record the reason in the linked issue evidence.`,
  );
}
