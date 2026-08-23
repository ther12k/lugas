/**
 * Runtime manifest route-record capture (M4-002).
 *
 * Captures deterministic per-route records during composition — never by
 * inspecting compiled handlers — and classifies entries exactly like the
 * composition ownership index does:
 *
 * - bare `Response` / `Blob` / primitive values → native `"static"`;
 * - plain functions → native `"handler"`;
 * - `{ dir: string }` sole-key objects → native `"directory"`;
 * - `route()` descriptors (object with a handler + before array) expand to
 *   one record per declared uppercase method key, kind `"lugas"`; the key is
 *   recorded verbatim (including Bun's `ALL`) because that is the runtime
 *   truth. Final serialized representation of wildcard/ALL methods is owned
 *   by the manifest serialization step and the frozen v1 document.
 *
 * Records retain no handler or service references: they are frozen,
 * JSON-serializable snapshots of composition facts.
 */
import type { Composition } from "./compose";

export type ManifestRouteKind = "native" | "lugas";

export type NativeRouteShape = "static" | "handler" | "directory";

export type ManifestMethod = string;

export type ManifestRouteRecord = {
  /** Declared uppercase method key; `"*"` for native any-method entries. */
  readonly method: ManifestMethod;
  readonly path: string;
  readonly module: string | null;
  readonly kind: ManifestRouteKind;
  /** Present only when `kind === "native"`. */
  readonly native?: NativeRouteShape | undefined;
};

function classifyNative(entry: unknown): NativeRouteShape {
  if (typeof entry === "function") {
    return "handler";
  }
  if (entry instanceof Response || entry instanceof Blob) {
    return "static";
  }
  return "static";
}

function isDirectoryEntry(entry: object): boolean {
  const record = entry as Record<string, unknown>;
  return typeof record.dir === "string" && Object.keys(record).length === 1;
}

/** Expands one composed entry into zero or more manifest records. */
function recordsForEntry(owner: { module: string | null; path: string }, entry: unknown): ManifestRouteRecord[] {
  if (
    entry instanceof Response ||
    entry instanceof Blob ||
    typeof entry !== "object" ||
    entry === null
  ) {
    return [
      Object.freeze({
        method: "*",
        path: owner.path,
        module: owner.module,
        kind: "native",
        native: typeof entry === "function" ? "handler" : "static",
      }),
    ];
  }
  if (isDirectoryEntry(entry)) {
    return [
      Object.freeze({
        method: "*",
        path: owner.path,
        module: owner.module,
        kind: "native",
        native: "directory",
      }),
    ];
  }
  // Method-map objects: one child per declared uppercase method key. Each
  // child is classified on its own so `{ GET: route(...) }`, `{ GET: new
  // Response(...) }`, and Bun's `ALL` are all recorded truthfully.
  const record = entry as Record<string, unknown>;
  const out: ManifestRouteRecord[] = [];
  for (const key of Object.keys(record)) {
    if (key === "" || key !== key.toUpperCase()) {
      continue;
    }
    const child = record[key];
    if (
      child instanceof Response ||
      child instanceof Blob ||
      typeof child !== "object" ||
      child === null
    ) {
      out.push(
        Object.freeze({
          method: key,
          path: owner.path,
          module: owner.module,
          kind: "native",
          native: typeof child === "function" ? ("handler" as const) : ("static" as const),
        }),
      );
      continue;
    }
    if (isDirectoryEntry(child)) {
      out.push(
        Object.freeze({
          method: key,
          path: owner.path,
          module: owner.module,
          kind: "native",
          native: "directory" as const,
        }),
      );
      continue;
    }
    out.push(
      Object.freeze({
        method: key,
        path: owner.path,
        module: owner.module,
        kind: "lugas",
      }),
    );
  }
  return out;
}

/**
 * Captures one record per final method/path from the composition, in
 * declaration order. Every final method/path appears exactly once because
 * composition rejects duplicates before this runs.
 */
export function captureRouteRecords(composition: Composition): readonly ManifestRouteRecord[] {
  const records: ManifestRouteRecord[] = [];
  for (const { owner, entry } of composition.routes) {
    records.push(...recordsForEntry(owner, entry));
  }
  return Object.freeze(records);
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
