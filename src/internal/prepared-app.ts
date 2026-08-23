/**
 * Canonical prepared-application graph (M4R1-001).
 *
 * Built exactly once inside `defineApp()`: route/module structures are
 * snapshotted, every entry is classified once against the pinned Bun oracle,
 * and Lugas descriptors are compiled once with the resolved error policy.
 * The resulting frozen graph is the single input consumed by `serve()` —
 * serving never re-reads user configuration, so later mutations of the
 * caller's route objects cannot diverge the server from the manifest.
 *
 * Services stay live references by contract; structural immutability applies
 * to routing/policy ownership, not service contents. Per-method merge
 * semantics across owners are preserved exactly as-is here and are owned by
 * M4R1-002.
 */
import { diagnostic } from "./diagnostics";
import { classifyRoute } from "./classify-route";
import { compileRoute } from "./compile-route";
import { defaultNotFound, defaultOnError, withErrorPolicy, type ErrorPolicy, type NotFoundPolicy } from "./error-policy";
import type { ModuleDescriptor } from "../core/types";

export type SafeServeOptions = {
  port?: number | string;
  hostname?: string;
  development?: boolean;
  fetch?: (request: Request, server: Bun.Server<unknown>) => Response | Promise<Response>;
  routes?: Record<string, unknown>;
  [key: string]: unknown;
};

/** Frozen, Bun-ready output of preparation. Consumed by `serveApp()`. */
export type PreparedApp = {
  /** Compiled Bun route map; values are exactly what `Bun.serve` accepts. */
  readonly bunRoutes: Readonly<Record<string, unknown>>;
  /** Resolved not-found policy captured at definition time. */
  readonly notFound: NotFoundPolicy;
};

function freezeContainers(value: Record<string, unknown>): Record<string, unknown> {
  // Freezes only containers this module created (the compiled route map and
  // its per-path method maps). User-owned values — native method maps,
  // Response/Blob instances, descriptors — pass through untouched.
  Object.freeze(value);
  return value;
}

export function prepareApp<TServices>(config: {
  routes?: Readonly<Record<string, unknown>> | undefined;
  modules?: ReadonlyArray<ModuleDescriptor<TServices, any>> | undefined;
  services: TServices;
  notFound?: NotFoundPolicy | undefined;
  onError?: ErrorPolicy | undefined;
}): PreparedApp {
  const onError = config.onError ?? defaultOnError;

  // Structural snapshot: own-key copies of root and module route maps, in
  // declaration order (module entries replace earlier path entries — current
  // assembly semantics; merge semantics are owned by M4R1-002).
  const routeEntries: Record<string, unknown> = { ...(config.routes ?? {}) };
  for (const module_ of config.modules ?? []) {
    for (const [path, entry] of Object.entries((module_.routes ?? {}) as Record<string, unknown>)) {
      routeEntries[path] = entry;
    }
  }

  const compiled: Record<string, unknown> = {};
  for (const [path, entry] of Object.entries(routeEntries)) {
    // Bare function routes pass through verbatim: Bun's native router accepts
    // them (pinned-oracle fact) and the manifest records them as native
    // "handler". Full classifier conformance is owned by M4R1-004.
    if (typeof entry === "function") {
      compiled[path] = entry;
      continue;
    }
    // Bun method maps may contain Lugas descriptors per method. Compile only
    // those values; preserve native method values exactly.
    if (typeof entry === "object" && entry !== null && !(entry instanceof Response) && !(entry instanceof Blob) && !('handler' in entry) && !('dir' in entry)) {
      const methodMap: Record<string, unknown> = {};
      for (const [method, value] of Object.entries(entry as Record<string, unknown>)) {
        const methodKind = classifyRoute(value);
        if (methodKind.kind === "lugas-descriptor") {
          const routeId = `${method} ${path}`;
          methodMap[method] = withErrorPolicy(compileRoute(routeId, methodKind.descriptor, config.services).handler, onError, routeId);
        } else if (methodKind.kind === "unsupported") {
          throw diagnostic("LUGAS_ROUTES_002", `unsupported route entry at ${method} ${path}`, {
            context: { method, path },
          });
        } else if (methodKind.kind === "native-response") methodMap[method] = methodKind.response;
        else if (methodKind.kind === "native-file") methodMap[method] = methodKind.file;
        else if (methodKind.kind === "native-dir") methodMap[method] = { dir: methodKind.path };
        else methodMap[method] = methodKind.map;
      }
      compiled[path] = Object.freeze(methodMap);
      continue;
    }
    const kind = classifyRoute(entry);
    if (kind.kind === "lugas-descriptor") {
      const routeId = `* ${path}`;
      const handler = compileRoute(routeId, kind.descriptor, config.services).handler;
      compiled[path] = withErrorPolicy(handler, onError, routeId);
    } else if (kind.kind === "unsupported") {
      throw diagnostic("LUGAS_ROUTES_003", `unsupported route entry at ${path}`, {
        context: { path },
      });
    } else if (kind.kind === "native-response") {
      compiled[path] = kind.response;
    } else if (kind.kind === "native-file") {
      compiled[path] = kind.file;
    } else if (kind.kind === "native-dir") {
      compiled[path] = { dir: kind.path };
    } else {
      compiled[path] = kind.map;
    }
  }

  return Object.freeze({
    bunRoutes: Object.freeze(freezeContainers(compiled)),
    notFound: config.notFound ?? defaultNotFound,
  });
}
