/**
 * Golden runner (M4-009). READ-ONLY: ordinary tests never update goldens.
 *
 * On drift, fails with the intentional update command so a human reviews
 * `git diff tests/golden` before fixtures change.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  buildCatalogGolden,
  buildManifestGolden,
  buildSampleGoldens,
  CATALOG_GOLDEN_PATH,
  MANIFEST_GOLDEN_PATH,
  SAMPLES_GOLDEN_PATH,
} from "./golden-sources";

const ROOT = resolve(import.meta.dir, "../..");

function golden(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("manifest golden", () => {
  test("fixture A serialization matches the committed fixture", () => {
    const actual = buildManifestGolden();
    const expected = golden(MANIFEST_GOLDEN_PATH);
    if (actual !== expected) {
      console.error(
        `manifest golden drifted. Review the diff, then run:\n` +
          `  bun run scripts/update-goldens.ts --apply\n` +
          `First differing region:\n${firstDiff(expected, actual)}`,
      );
    }
    expect(actual).toBe(expected);
  });
});

describe("diagnostics goldens", () => {
  test("catalog codes/meanings/hints match the committed fixture", () => {
    const actual = JSON.stringify(buildCatalogGolden(), null, 2) + "\n";
    expect(actual).toBe(golden(CATALOG_GOLDEN_PATH));
  });

  test("family samples match the committed fixture", () => {
    const actual = JSON.stringify(buildSampleGoldens(), null, 2) + "\n";
    expect(actual).toBe(golden(SAMPLES_GOLDEN_PATH));
  });
});

function firstDiff(expected: string, actual: string): string {
  const e = expected.split("\n");
  const a = actual.split("\n");
  for (let i = 0; i < Math.max(e.length, a.length); i++) {
    if (e[i] !== a[i]) {
      return `line ${i + 1}\n- ${e[i] ?? "<eof>"}\n+ ${a[i] ?? "<eof>"}`;
    }
  }
  return "";
}
