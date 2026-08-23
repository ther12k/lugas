/**
 * `defineApp()` validation and composition shell (M1-007).
 *
 * Validates configuration, composes routes/modules into internal state, and
 * exposes a placeholder truthful manifest. Serving is implemented by M1-015;
 * this shell never starts a server.
 */
import { diagnostic } from "../internal/diagnostics";
import { brand } from "../internal/brands";
import { compose, type Composition } from "../internal/compose";
import { buildManifest, type LugasManifestV1 } from "../internal/manifest";
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
  /** Frozen runtime-truth manifest (lugas-manifest-v1) — reading starts no server. */
  readonly manifest: LugasManifestV1;
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
  const composition = compose({
    routes: config.routes,
    modules: (config.modules ?? []) as ReadonlyArray<ModuleDescriptor<never>>,
  });
  const manifest = buildManifest(composition);
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
