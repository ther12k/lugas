/**
 * Route facts — the single-interpreter bridge between preparation and the
 * manifest (M4R1-008, ADR-0017).
 *
 * Facts are captured exactly once inside `prepareApp()` while entries are
 * classified for assembly. The manifest module consumes them read-only: it
 * never re-classifies user values. The shape here IS the manifest record
 * shape; `ManifestRouteRecord` in manifest.ts aliases `RouteFact`.
 */

export const CAPABILITY_ORDER = ["params", "query", "headers", "body"] as const;

export type RouteCapability = (typeof CAPABILITY_ORDER)[number];

export type NativeRouteShape = "static" | "handler" | "directory";

export type RouteFact = {
  /** `"*"` for any-method claims; otherwise one of the seven HTTP verbs. */
  readonly method: string;
  readonly path: string;
  readonly module: string | null;
  readonly kind: "native" | "lugas";
  /** Present only when `kind === "native"` (ADR-0017). */
  readonly native?: NativeRouteShape | undefined;
  /** Declared validator slots, canonical order. */
  readonly validates: readonly RouteCapability[];
  /** Guard names in execution order. */
  readonly guards: readonly string[];
};

export function makeFact(fact: RouteFact): RouteFact {
  return Object.freeze({
    ...fact,
    validates: Object.freeze([...fact.validates]),
    guards: Object.freeze([...fact.guards]),
  });
}

type DescriptorLike = {
  before?: unknown;
  params?: unknown;
  query?: unknown;
  headers?: unknown;
  body?: unknown;
};

/** Extracts declared validator slots and guard names from a descriptor-like value. */
export function descriptorFacts(descriptor: DescriptorLike): {
  readonly validates: readonly RouteCapability[];
  readonly guards: readonly string[];
} {
  const validates = CAPABILITY_ORDER.filter((slot) => descriptor[slot] !== undefined);
  const before = Array.isArray(descriptor.before) ? descriptor.before : [];
  const guards = before.map((g) => (g as { name?: unknown }).name as string);
  return { validates, guards };
}
