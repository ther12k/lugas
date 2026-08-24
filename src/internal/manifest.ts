/**
 * Runtime manifest assembly (M4-002, M4R1-008, ADR-0017).
 *
 * Route records are RouteFacts captured once at classification time inside
 * `prepareApp()` — this module never re-classifies user values. It orders
 * (frozen v1 policy), assembles the frozen document, and serializes.
 * `frameworkVersion` is a generated build constant (no filesystem reads).
 */
import { FRAMEWORK_VERSION } from "./framework-version";
import type { PreparedApp } from "./prepared-app";
import type { RouteCapability, RouteFact } from "./route-fact";

/** Frozen v1 manifest shape (docs/manifest-v1.md, amended by ADR-0017). */
export type LugasManifestV1 = {
  readonly format: "lugas-manifest-v1";
  readonly frameworkVersion: string;
  readonly bunCompatibility: string;
  readonly modules: ReadonlyArray<{
    readonly name: string;
    readonly routes: readonly string[];
  }>;
  readonly routes: ReadonlyArray<ManifestRouteRecord>;
};

export type ManifestRouteKind = "native" | "lugas";

/** Manifest record shape — an alias of the preparation-time RouteFact. */
export type ManifestRouteRecord = RouteFact;
export type ManifestMethod = string;
export { CAPABILITY_ORDER } from "./route-fact";
export type { NativeRouteShape } from "./route-fact";
export type { RouteCapability as ManifestCapability } from "./route-fact";

const EMPTY_CAPABILITIES: ReadonlyArray<RouteCapability> = Object.freeze([]);
const EMPTY_GUARDS: readonly string[] = Object.freeze([]);

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach(deepFreeze);
  } else if (typeof value === "object" && value !== null) {
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return Object.freeze(value);
}

/**
 * Captures one record per prepared route fact. Facts are already classified;
 * ordering is applied by sortForSerialization before assembly.
 */
export function captureRouteRecords(facts: readonly RouteFact[]): readonly ManifestRouteRecord[] {
  // Facts are individually frozen at creation (route-fact.ts) and the
  // prepared array is frozen; no copying, so freeze status is preserved.
  return Object.freeze(facts);
}

/**
 * Serialization ordering from the frozen v1 policy: ascending by path then
 * method, code-unit order (so native `"*"` rows precede explicit verbs on
 * the same path).
 */
export function sortForSerialization(
  records: readonly ManifestRouteRecord[],
): readonly ManifestRouteRecord[] {
  return Object.freeze(
    [...records].sort((a, b) => {
      if (a.path !== b.path) {
        return a.path < b.path ? -1 : 1;
      }
      return a.method < b.method ? -1 : a.method > b.method ? 1 : 0;
    }),
  );
}

/**
 * Assembles the complete frozen v1 manifest from a composition. Pure:
 * performs no requests, starts no server, executes no handlers.
 */
export function buildManifest(prepared: PreparedApp, moduleNames: readonly string[]): LugasManifestV1 {
  const records = sortForSerialization(captureRouteRecords(prepared.facts));
  const modules = moduleNames
    .map((name) => ({
      name,
      routes: [...new Set(records.filter((r) => r.module === name).map((r) => r.path))].sort(),
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return deepFreeze({
    format: "lugas-manifest-v1",
    frameworkVersion: FRAMEWORK_VERSION,
    bunCompatibility: `bun@${Bun.version}`,
    modules,
    routes: records,
  });
}

/**
 * Ordinary JSON serialization with stable property/array order (the builder
 * constructs keys in schema order, so plain stringify is deterministic).
 */
export function serializeManifest(manifest: LugasManifestV1): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
