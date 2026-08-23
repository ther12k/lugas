/**
 * Canonical prepared-application graph (M4R1-001, M4R1-002).
 *
 * Built exactly once inside `defineApp()`: route/module structures are
 * snapshotted, declarations are grouped per path, different HTTP methods on
 * one path merge into a single frozen method map (order-independently), and
 * every surviving entry is classified once against the pinned Bun oracle.
 * Lugas descriptors compile once with the resolved error policy. The frozen
 * graph is the single input consumed by `serve()` — serving never re-reads
 * user configuration.
 *
 * Collision semantics (duplicates are fatal; module order never wins):
 * - same exact method + same path -> startup diagnostic naming both owners
 * - different methods + same path -> merge into one method map
 * - any-method value vs explicit-method map on one path -> explicit
 *   diagnostic: raw Bun resolves such overlap by insertion order, which is
 *   precisely the silent order-dependence Lugas forbids.
 *
 * Services stay live references by contract; structural immutability applies
 * to routing/policy ownership, not service contents.
 */
import { diagnostic, duplicateRoute } from "./diagnostics";
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

type Declaration = { readonly owner: string; readonly entry: unknown };
type MethodClaim = { readonly owner: string; readonly value: unknown };

function isPlainEntryObject(entry: unknown): entry is Record<string, unknown> {
  return typeof entry === "object" && entry !== null && !(entry instanceof Response) && !(entry instanceof Blob) && !("handler" in entry) && !("dir" in entry);
}

/** True when an entry serves all methods instead of named ones: functions,
 * native Response/Blob values, `{ dir }` maps, and Lugas descriptors. */
function isAnyMethodEntry(entry: unknown): boolean {
  return typeof entry === "function" || !isPlainEntryObject(entry);
}

export function prepareApp<TServices>(config: {
  routes?: Readonly<Record<string, unknown>> | undefined;
  modules?: ReadonlyArray<ModuleDescriptor<TServices, any>> | undefined;
  services: TServices;
  notFound?: NotFoundPolicy | undefined;
  onError?: ErrorPolicy | undefined;
}): PreparedApp {
  const onError = config.onError ?? defaultOnError;

  // Collect declarations per path, in declaration order (root first, then
  // modules in order). Ownership is tracked per method for diagnostics.
  const declarationsByPath = new Map<string, Declaration[]>();
  const declare = (owner: string, source: Readonly<Record<string, unknown>> | undefined): void => {
    for (const [path, entry] of Object.entries(source ?? {})) {
      let list = declarationsByPath.get(path);
      if (list === undefined) {
        list = [];
        declarationsByPath.set(path, list);
      }
      list.push({ owner, entry });
    }
  };
  declare("app root routes", config.routes);
  for (const module_ of config.modules ?? []) {
    declare(`module '${module_.name}'`, (module_.routes ?? {}) as Record<string, unknown>);
  }

  const compileMethodValue = (method: string, path: string, value: unknown): unknown => {
    const kind = classifyRoute(value);
    if (kind.kind === "lugas-descriptor") {
      const routeId = `${method} ${path}`;
      return withErrorPolicy(compileRoute(routeId, kind.descriptor, config.services).handler, onError, routeId);
    }
    if (kind.kind === "unsupported") {
      throw diagnostic("LUGAS_ROUTES_002", `unsupported route entry at ${method} ${path}`, {
        context: { method, path },
      });
    }
    if (kind.kind === "native-response") return kind.response;
    if (kind.kind === "native-file") return kind.file;
    if (kind.kind === "native-dir") return { dir: kind.path };
    return kind.map;
  };

  const compiled: Record<string, unknown> = {};
  for (const [path, declarations] of declarationsByPath) {
    const anyClaims: Declaration[] = [];
    const methodClaims = new Map<string, MethodClaim>();

    for (const { owner, entry } of declarations) {
      const plain = isPlainEntryObject(entry) ? entry : undefined;
      if (plain === undefined) {
        anyClaims.push({ owner, entry });
        continue;
      }
      for (const [method, value] of Object.entries(plain)) {
        const prior = methodClaims.get(method);
        if (prior !== undefined) {
          // Defensive: identical exact-method re-declarations are already
          // fatal in composition; assembly refuses them independently so no
          // caller can bypass ownership by reaching this layer directly.
          throw duplicateRoute(method, path, prior.owner, owner);
        }
        methodClaims.set(method, { owner, value });
      }
    }

    if (anyClaims.length > 1) {
      throw duplicateRoute("*", path, anyClaims[0]!.owner, anyClaims[1]!.owner);
    }
    if (anyClaims.length === 1 && methodClaims.size > 0) {
      const firstMethod = methodClaims.keys().next().value as string;
      const methodOwner = methodClaims.get(firstMethod)!.owner;
      // Pinned-oracle enforcement: raw Bun keeps one value per path and would
      // resolve this overlap by insertion order. Lugas fails closed instead.
      throw duplicateRoute("*", path, anyClaims[0]!.owner, methodOwner);
    }

    if (anyClaims.length === 1) {
      const entry = anyClaims[0]!.entry;
      // Bare function routes pass through verbatim: Bun's native router
      // accepts them (pinned-oracle fact); full classifier conformance is
      // owned by M4R1-004.
      if (typeof entry === "function") {
        compiled[path] = entry;
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
      continue;
    }

    const methodMap: Record<string, unknown> = {};
    for (const [method, claim] of methodClaims) {
      methodMap[method] = compileMethodValue(method, path, claim.value);
    }
    compiled[path] = Object.freeze(methodMap);
  }

  return Object.freeze({
    bunRoutes: Object.freeze(freezeContainers(compiled)),
    notFound: config.notFound ?? defaultNotFound,
  });
}
