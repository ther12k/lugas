/**
 * `defineApp()` validation and composition shell (M1-007, M4R1-001).
 *
 * Validates configuration, composes routes/modules into internal state, and
 * exposes a truthful frozen manifest. The canonical PreparedApp graph is
 * snapshotted, classified, and compiled exactly once here; serving consumes
 * only that graph and never re-reads user configuration.
 */
import { diagnostic } from "../internal/diagnostics";
import { brand } from "../internal/brands";
import { compose, type Composition } from "../internal/compose";
import { buildManifest, type LugasManifestV1 } from "../internal/manifest";
import { prepareApp, type PreparedApp } from "../internal/prepared-app";
import type { LugasApp, MergeModulesRoutes, ModuleDescriptor } from "./types";
import { serveApp } from "../internal/serve";

export type AppConfig<TServices, TRoutes = Readonly<Record<string, unknown>>> = {
  services?: TServices;
  routes?: TRoutes;
  modules?: ReadonlyArray<ModuleDescriptor<TServices, any>>;
  notFound?: (request: Request) => Response | Promise<Response>;
  onError?: (error: unknown, request: Request) => Response | Promise<Response>;
};

const APP_KEYS = new Set(["services", "routes", "modules", "notFound", "onError"]);

export type AppInternals<TServices = unknown> = {
  readonly composition: Composition;
  /** Frozen runtime-truth manifest (lugas-manifest-v1) — reading starts no server. */
  readonly manifest: LugasManifestV1;
  /** Canonical prepared graph — the only input `serveApp()` consumes. */
  readonly prepared: PreparedApp;
};

export type LugasAppInstance<TServices = unknown, TRoutes = unknown> = LugasApp<TServices, TRoutes> & {
  readonly manifest: AppInternals<TServices>["manifest"];
  readonly serve: (options?: import("../internal/serve").SafeServeOptions) => Bun.Server<unknown>;
};

export function defineApp<
  TServices = unknown,
  const TRoutes extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
  const TModules extends ReadonlyArray<ModuleDescriptor<TServices, any>> = readonly [],
>(
  config: AppConfig<TServices, TRoutes> & { readonly modules?: TModules },
): LugasAppInstance<TServices, TRoutes & MergeModulesRoutes<TModules>> {
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_APP_001", "defineApp(): config must be an object", { hint: "pass defineApp({ routes }) with an object literal" });
  }
  for (const key of Object.keys(config)) {
    if (!APP_KEYS.has(key)) {
      throw diagnostic("LUGAS_APP_002", `defineApp(): unknown config key '${key}'`, { hint: "allowed keys: services, routes, modules, notFound, onError", context: { key } });
    }
  }
  if (config.modules !== undefined) {
    if (!Array.isArray(config.modules)) throw diagnostic("LUGAS_APP_003", "defineApp(): 'modules' must be an array", { hint: "wrap modules: modules: [defineModule(...)]" });
    const names = new Set<string>();
    for (const module_ of config.modules) {
      if (typeof module_ !== "object" || module_ === null || typeof (module_ as ModuleDescriptor<TServices>).name !== "string") {
        throw diagnostic("LUGAS_APP_004", "defineApp(): 'modules' entries must be defineModule() descriptors", {
          hint: "create modules with defineModule({ name, routes })",
        });
      }
      if (names.has(module_.name)) {
        throw diagnostic("LUGAS_APP_005", `defineApp(): duplicate module name '${module_.name}'`, { hint: "module names must be unique within an app", context: { module: module_.name } });
      }
      names.add(module_.name);
    }
  }
  if (config.routes !== undefined && (typeof config.routes !== "object" || config.routes === null)) {
    throw diagnostic("LUGAS_APP_006", "defineApp(): 'routes' must be an object keyed by full path", { hint: 'use string paths like "/users/:id"' });
  }
  // Composition validates ownership (duplicate rejection across owners) but
  // no longer feeds the manifest.
  const composition = compose({
    routes: config.routes,
    modules: (config.modules ?? []) as ReadonlyArray<ModuleDescriptor<never>>,
  });
  // Snapshot + classify + compile exactly once. Services stay live references;
  // routing structure is captured here and never re-read at serve time.
  const prepared = prepareApp({
    routes: config.routes,
    modules: config.modules as ReadonlyArray<ModuleDescriptor<TServices, any>> | undefined,
    services: config.services as TServices,
    notFound: config.notFound,
    onError: config.onError,
  });
  // Manifest records come from the prepared graph facts — single interpreter
  // (M4R1-008, ADR-0017).
  const manifest = buildManifest(prepared, composition.moduleNames);
  return brand(
    Object.freeze({
      services: config.services as TServices,
      composition,
      manifest,
      prepared,
      serve: (options?: import("../internal/serve").SafeServeOptions) => serveApp(prepared, options),
    }),
    "LugasApp",
  ) as unknown as LugasAppInstance<TServices, TRoutes & MergeModulesRoutes<TModules>>;
}
