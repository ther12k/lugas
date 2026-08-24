/**
 * Golden content builders (M4-009).
 *
 * Single source for both the golden runner (read-only) and the intentional
 * update command. Normalization policy: ONLY truly unstable environment data
 * is normalized — the observed Bun version inside `bunCompatibility`.
 * Framework version is a synced build constant and stays literal.
 */
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";
import {
  DIAGNOSTIC_CATALOG,
  diagnostic,
  duplicateRoute,
  formatDiagnostic,
  type LugasDiagnosticError,
} from "../../src/internal/diagnostics";
import { serializeManifest } from "../../src/internal/manifest";
import { fixtureApp } from "./manifest/fixture-app";

const BUN_PLACEHOLDER = "<bun-version>";

export const MANIFEST_GOLDEN_PATH = "tests/golden/manifest/manifest-a.golden.json";
export const CATALOG_GOLDEN_PATH = "tests/golden/diagnostics/catalog.golden.json";
export const SAMPLES_GOLDEN_PATH = "tests/golden/diagnostics/samples.golden.json";

/** Serialized manifest with environment data normalized. */
export function buildManifestGolden(): string {
  const serialized = serializeManifest(fixtureApp().manifest);
  return serialized.replace(
    /"bunCompatibility": "bun@[^"]*"/,
    `"bunCompatibility": "${BUN_PLACEHOLDER}"`,
  );
}

type CatalogRow = {
  code: string;
  thrownBy: string;
  meaning: string;
  hint: string;
};

export function buildCatalogGolden(): CatalogRow[] {
  return DIAGNOSTIC_CATALOG.map((entry) => ({
    code: entry.code,
    thrownBy: entry.thrownBy,
    meaning: entry.meaning,
    hint: entry.hint,
  }));
}

function jsonOf(error: LugasDiagnosticError): Record<string, unknown> {
  return JSON.parse(formatDiagnostic(error, "json")) as Record<string, unknown>;
}

export type DiagnosticSample = { family: string } & Record<string, unknown>;

/** One representative thrown diagnostic per framework family. */
export function buildSampleGoldens(): DiagnosticSample[] {
  const out: DiagnosticSample[] = [];
  const push = (family: string, error: LugasDiagnosticError): void => {
    out.push({ family, ...jsonOf(error) });
  };
  const capture = (family: string, run: () => unknown): void => {
    try {
      run();
    } catch (error) {
      push(family, error as LugasDiagnosticError);
      return;
    }
    throw new Error(`expected ${family} diagnostic to throw`);
  };

  capture("APP", () => defineApp({ bogus: 1 } as never));
  capture("MODULE", () => defineModule({ bogus: 1 } as never));
  capture("ROUTE", () => route({ bogus: 1 } as never));
  capture("GUARD", () =>
    guard({ name: "", handler: () => ({}) as never }),
  );
  push("ROUTES", duplicateRoute("GET", "/x", "module 'a'", "module 'b'"));
  push(
    "TEST",
    diagnostic("LUGAS_TEST_001", "createTestServer(): forbidden option 'routes'", {
      hint: "the test server inherits routes/errors from the app; configure them via defineApp/route/guard",
      context: { key: "routes" },
    }),
  );
  return out;
}
