/**
 * Route-entry classification (M1-008, M4R1-004).
 *
 * Every composed route entry is classified against the pinned Bun 1.4
 * oracle: Lugas descriptors compile (M1-009); recognized native values —
 * including plain functions at path level and per-method positions, which
 * Bun's router accepts natively — pass through untouched; anything else
 * fails closed at startup rather than producing a Bun runtime surprise.
 */
import type { RouteDescriptor } from "../core/types";

export type RouteEntry =
  | { kind: "lugas-descriptor"; descriptor: RouteDescriptor<never> }
  | { kind: "native-response"; response: Response }
  | { kind: "native-file"; file: Blob }
  | { kind: "native-dir"; path: string }
  | { kind: "native-handler"; handler: (request: Request) => Response | Promise<Response> }
  | { kind: "native-method-map"; map: Record<string, unknown> }
  | { kind: "unsupported"; entry: unknown };

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

export function classifyRoute(entry: unknown): RouteEntry {
  if (entry instanceof Response) return { kind: "native-response", response: entry };
  // Bun.file() returns a Blob subclass (BunFile), not necessarily a File.
  if (entry instanceof Blob) return { kind: "native-file", file: entry };
  // Plain functions are native handlers in raw Bun, at path level and inside
  // method maps alike (pinned-oracle fact; M4R1-004).
  if (typeof entry === "function") {
    return { kind: "native-handler", handler: entry as (request: Request) => Response | Promise<Response> };
  }
  if (typeof entry !== "object" || entry === null) return { kind: "unsupported", entry };
  const record = entry as Record<string, unknown>;
  if (
    typeof record.handler === "function" &&
    Array.isArray(record.before)
  ) {
    return { kind: "lugas-descriptor", descriptor: entry as unknown as RouteDescriptor<never> };
  }
  if (typeof record.dir === "string" && Object.keys(record).length === 1) {
    return { kind: "native-dir", path: record.dir };
  }
  const keys = Object.keys(record);
  if (keys.length > 0 && keys.every((k) => HTTP_METHODS.has(k))) {
    return { kind: "native-method-map", map: record };
  }
  return { kind: "unsupported", entry };
}
