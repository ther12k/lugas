/**
 * `defineApp()` validation and composition shell (M1-007).
 *
 * Validates configuration, composes routes/modules into internal state, and
 * exposes a placeholder truthful manifest. Serving is implemented by M1-015;
 * this shell never starts a server.
 */
import { brand } from "../internal/brands";
import { compose, type Composition } from "../internal/compose";
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
  readonly config: AppConfig<TServices, any>;
  readonly composition: Composition;
  readonly manifest: Readonly<{ modules: ReadonlyArray<string>; routeCount: number }>;
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
    throw new Error("defineApp(): config must be an object");
  }
  for (const key of Object.keys(config)) {
    if (!APP_KEYS.has(key)) {
      throw new Error(`defineApp(): unknown config key '${key}' (allowed: services, routes, modules, notFound, onError)`);
    }
  }
  if (config.modules !== undefined) {
    if (!Array.isArray(config.modules)) throw new Error("defineApp(): 'modules' must be an array");
    const names = new Set<string>();
    for (const module_ of config.modules) {
      if (typeof module_ !== "object" || module_ === null || typeof (module_ as ModuleDescriptor<TServices>).name !== "string") {
        throw new Error("defineApp(): 'modules' entries must be defineModule() descriptors");
      }
      if (names.has(module_.name)) {
        throw new Error(`defineApp(): duplicate module name '${module_.name}'`);
      }
      names.add(module_.name);
    }
  }
  if (config.routes !== undefined && (typeof config.routes !== "object" || config.routes === null)) {
    throw new Error("defineApp(): 'routes' must be an object keyed by full path");
  }
  const composition = compose({
    routes: config.routes,
    modules: (config.modules ?? []) as ReadonlyArray<ModuleDescriptor<never>>,
  });
  const manifest = Object.freeze({ modules: composition.moduleNames, routeCount: composition.routes.length });
  return brand(
    Object.freeze({
      services: config.services as TServices,
      config,
      composition,
      manifest,
      serve: (options?: import("../internal/serve").SafeServeOptions) => serveApp(config, options),
    }),
    "LugasApp",
  ) as unknown as LugasAppInstance<TServices, TRoutes & MergeModulesRoutes<TModules>>;
}
