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

export type ModuleConfig<TServices, TRoutes = Readonly<Record<string, unknown>>> = {
  name: string;
  routes: TRoutes;
};

const MODULE_KEYS = new Set(["name", "routes"]);

export function defineModule<
  TServices = unknown,
  const TRoutes extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
>(config: ModuleConfig<TServices, TRoutes>): ModuleDescriptor<TServices, TRoutes> {
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
  const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
  const seen = new Set<string>();
  for (const [path, entry] of Object.entries(config.routes)) {
    if (typeof entry !== "object" || entry === null) {
      continue; // native Response/Bun.file values and descriptors validated at composition
    }
    for (const method of Object.keys(entry as Record<string, unknown>)) {
      const canonical = method.toUpperCase();
      if (!HTTP_METHODS.has(canonical)) continue; // non-method keys validated at composition
      const dedupe = `${canonical} ${path}`;
      if (seen.has(dedupe)) {
        throw new Error(`defineModule(): duplicate route entry '${method} ${path}'`);
      }
      seen.add(dedupe);
    }
  }
  return brand(Object.freeze({ name: config.name, routes: config.routes }), "ModuleDescriptor");
}
