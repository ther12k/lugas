/**
 * `defineModule()` named route containers (M1-006).
 *
 * A module is a named bag of full-path routes (ADR-0015): no hidden prefix,
 * no lifecycle scope, no service locator. Route-map values are preserved
 * exactly as declared — Lugas descriptors and native Bun values alike — so
 * compilation (M1-008/M1-009) sees the original objects.
 */
import { diagnostic } from "../internal/diagnostics";
import { brand } from "../internal/brands";
import { assertValidRoutePath } from "../internal/path";
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
    throw diagnostic("LUGAS_MODULE_001", "defineModule(): config must be an object", { hint: "pass defineModule({ name, routes })" });
  }
  for (const key of Object.keys(config)) {
    if (!MODULE_KEYS.has(key)) {
      throw diagnostic("LUGAS_MODULE_002", `defineModule(): unknown config key '${key}'`, { hint: "allowed keys: name, routes", context: { key } });
    }
  }
  if (typeof config.name !== "string" || config.name.trim() === "") {
    throw diagnostic("LUGAS_MODULE_003", "defineModule(): 'name' must be a non-empty string", { hint: "module names appear in manifests; use stable names" });
  }
  if (typeof config.routes !== "object" || config.routes === null || Array.isArray(config.routes)) {
    throw diagnostic("LUGAS_MODULE_004", "defineModule(): 'routes' must be an object keyed by full path", { hint: 'use string paths like "/invoices/:id"' });
  }
  const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
  const seen = new Set<string>();
  // M6R1-011: module paths share the canonical validator with root routes.
  for (const [path] of Object.entries(config.routes)) {
    assertValidRoutePath(path, "module");
  }
  for (const [path, entry] of Object.entries(config.routes)) {
    if (typeof entry !== "object" || entry === null) {
      continue; // native Response/Bun.file values and descriptors validated at composition
    }
    for (const method of Object.keys(entry as Record<string, unknown>)) {
      const canonical = method.toUpperCase();
      if (!HTTP_METHODS.has(canonical)) continue; // non-method keys validated at composition
      const dedupe = `${canonical} ${path}`;
      if (seen.has(dedupe)) {
        throw diagnostic("LUGAS_MODULE_005", `defineModule(): duplicate route entry '${method} ${path}'`, { hint: "each method+path may be declared once per module", context: { method, path } });
      }
      seen.add(dedupe);
    }
  }
  return brand(Object.freeze({ name: config.name, routes: config.routes }), "ModuleDescriptor");
}
