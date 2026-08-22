/**
 * Composition internals (M1-007): flatten app routes and module routes into
 * one ownership index without altering Bun path semantics. Duplicate
 * rejection lands with M1-012; this module only records ownership.
 */
import type { ModuleDescriptor } from "../core/types";
import { duplicateRoute } from "./diagnostics";

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
  // Deterministic ownership index: first declaration order wins — and any
  // second declaration of the same method+path throws with both owners.
  const owned = new Map<string, string>();
  const claim = (owner: string, method: string, path: string) => {
    const key = `${method} ${path}`;
    const prior = owned.get(key);
    if (prior !== undefined) {
      throw new Error(duplicateRoute(method, path, prior, owner).message);
    }
    owned.set(key, owner);
  };
  const ownerLabel = (module: string | null) => (module === null ? "app root routes" : `module '${module}'`);
  const indexEntry = (owner: string, path: string, entry: unknown) => {
    if (entry instanceof Response || entry instanceof Blob || typeof entry !== "object" || entry === null) {
      claim(owner, "*", path);
      return;
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.handler === "function" && Array.isArray(record.before)) {
      claim(owner, "*", path);
      return;
    }
    if (typeof record.dir === "string" && Object.keys(record).length === 1) {
      claim(owner, "*", path);
      return;
    }
    for (const method of Object.keys(record)) {
      if (method === method.toUpperCase()) claim(owner, method, path);
    }
  };
  for (const [path, entry] of Object.entries(config.routes ?? {})) {
    indexEntry("app root routes", path, entry);
    routes.push({ owner: { module: null, path }, entry });
  }
  for (const module_ of config.modules ?? []) {
    moduleNames.push(module_.name);
    for (const [path, entry] of Object.entries((module_.routes ?? {}) as Record<string, unknown>)) {
      indexEntry(ownerLabel(module_.name), path, entry);
      routes.push({ owner: { module: module_.name, path }, entry });
    }
  }
  return { routes, moduleNames };
}
