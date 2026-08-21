/**
 * Composition internals (M1-007): flatten app routes and module routes into
 * one ownership index without altering Bun path semantics. Duplicate
 * rejection lands with M1-012; this module only records ownership.
 */
import type { ModuleDescriptor } from "../core/types";

export type RouteOwner = { module: string | null; path: string };

export type ComposedRoute = {
  owner: RouteOwner;
  entry: unknown;
};

export type Composition = {
  routes: ReadonlyArray<ComposedRoute>;
  moduleNames: ReadonlyArray<string>;
};

export function compose(config: {
  routes?: Readonly<Record<string, unknown>> | undefined;
  modules?: ReadonlyArray<ModuleDescriptor<never>> | undefined;
}): Composition {
  const routes: ComposedRoute[] = [];
  const moduleNames: string[] = [];
  for (const [path, entry] of Object.entries(config.routes ?? {})) {
    routes.push({ owner: { module: null, path }, entry });
  }
  for (const module_ of config.modules ?? []) {
    moduleNames.push(module_.name);
    for (const [path, entry] of Object.entries(module_.routes)) {
      routes.push({ owner: { module: module_.name, path }, entry });
    }
  }
  return { routes, moduleNames };
}
