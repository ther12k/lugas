/**
 * `defineModule()` named route containers (M1-006).
 *
 * A module is a named bag of full-path routes (ADR-0015): no hidden prefix,
 * no lifecycle scope, no service locator. Route-map values are preserved
 * exactly as declared — Lugas descriptors and native Bun values alike — so
 * compilation (M1-008/M1-009) sees the original objects.
 */
import { brand } from "../internal/brands";
import type { ModuleDescriptor } from "./types";

export type ModuleConfig<TServices> = {
  name: string;
  routes: Readonly<Record<string, unknown>>;
};

const MODULE_KEYS = new Set(["name", "routes"]);

export function defineModule<TServices>(config: ModuleConfig<TServices>): ModuleDescriptor<TServices> {
  if (typeof config !== "object" || config === null) {
    throw new Error("defineModule(): config must be an object");
  }
  for (const key of Object.keys(config)) {
    if (!MODULE_KEYS.has(key)) {
      throw new Error(`defineModule(): unknown config key '${key}' (allowed: name, routes)`);
    }
  }
  if (typeof config.name !== "string" || config.name.trim() === "") {
    throw new Error("defineModule(): 'name' must be a non-empty string");
  }
  if (typeof config.routes !== "object" || config.routes === null || Array.isArray(config.routes)) {
    throw new Error("defineModule(): 'routes' must be an object keyed by full path");
  }
  const seen = new Set<string>();
  for (const [path, entry] of Object.entries(config.routes)) {
    if (typeof entry !== "object" || entry === null) {
      continue; // native Response/Bun.file values and descriptors validated at composition
    }
    for (const method of Object.keys(entry as Record<string, unknown>)) {
      const upper = method.toUpperCase();
      if (upper === method) continue; // method map entries cannot collide by construction
      const dedupe = `${method} ${path}`;
      if (seen.has(dedupe)) {
        throw new Error(`defineModule(): duplicate route entry '${dedupe}'`);
      }
      seen.add(dedupe);
    }
  }
  return brand(Object.freeze({ name: config.name, routes: config.routes }), "ModuleDescriptor");
}
