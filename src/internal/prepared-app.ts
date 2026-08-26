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
import { makeFact, descriptorFacts, type RouteFact } from "./route-fact";
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
  /** Route facts captured at classification time (ADR-0017 single interpreter). */
  readonly facts: ReadonlyArray<RouteFact>;
};

function freezeContainers(value: Record<string, unknown>): Record<string, unknown> {
  // Freezes only containers this module created (the compiled route map and
  // its per-path method maps). User-owned values — native method maps,
  // Response/Blob instances, descriptors — pass through untouched.
  Object.freeze(value);
  return value;
}

type Declaration = { readonly owner: string; readonly entry: unknown; readonly moduleName: string | null };
const ROOT_OWNER = "app root routes";

/** Supported uppercase HTTP method keys (M5R1-003). */
const VALID_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
type MethodClaim = { readonly owner: string; readonly value: unknown; readonly moduleName: string | null };

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
  const declare = (owner: string, moduleName: string | null, source: Readonly<Record<string, unknown>> | undefined): void => {
    for (const [path, entry] of Object.entries(source ?? {})) {
      let list = declarationsByPath.get(path);
      if (list === undefined) {
        list = [];
        declarationsByPath.set(path, list);
      }
      list.push({ owner, entry, moduleName });
    }
  };
  declare(ROOT_OWNER, null, config.routes);
  for (const module_ of config.modules ?? []) {
    declare(`module '${module_.name}'`, module_.name, (module_.routes ?? {}) as Record<string, unknown>);
  }

  const facts: RouteFact[] = [];

  const compileMethodValue = (method: string, path: string, moduleName: string | null, value: unknown): unknown => {
    const kind = classifyRoute(value);
    if (kind.kind === "lugas-descriptor") {
      const declared = descriptorFacts(kind.descriptor as unknown as Record<string, unknown>);
      facts.push(makeFact({ method, path, module: moduleName, kind: "lugas", ...declared }));
    } else if (kind.kind === "native-handler") {
      facts.push(makeFact({ method, path, module: moduleName, kind: "native", native: "handler", validates: [], guards: [] }));
    } else if (kind.kind === "native-response" || kind.kind === "native-file") {
      facts.push(makeFact({ method, path, module: moduleName, kind: "native", native: "static", validates: [], guards: [] }));
    } else if (kind.kind === "native-dir") {
      facts.push(makeFact({ method, path, module: moduleName, kind: "native", native: "directory", validates: [], guards: [] }));
    } else if (kind.kind !== "unsupported" && kind.kind !== "native-method-map") {
      // Opaque nested passthroughs record as static rows (ADR-0017 #4).
      facts.push(makeFact({ method, path, module: moduleName, kind: "native", native: "static", validates: [], guards: [] }));
    }
    if (kind.kind === "lugas-descriptor") {
      const routeId = `${method} ${path}`;
      return withErrorPolicy(compileRoute(routeId, kind.descriptor, config.services).handler, onError, routeId);
    }
    if (kind.kind === "unsupported") {
      throw diagnostic("LUGAS_ROUTES_002", `unsupported route entry at ${method} ${path}`, {
        context: { method, path },
      });
    }
    // Raw Bun semantics (M4R1-004): function values serve verbatim.
    if (kind.kind === "native-handler") return kind.handler;
    if (kind.kind === "native-response") return kind.response;
    if (kind.kind === "native-file") return kind.file;
    if (kind.kind === "native-dir") return { dir: kind.path };
    // M5R1 correction: nested method maps must fail closed
    if (kind.kind === "native-method-map") {
      throw diagnostic("LUGAS_ROUTES_002", `nested method map is not allowed at ${method} ${path}`, { context: { method, path } });
    }
    // All route kinds handled above; this line is unreachable.
    throw diagnostic("LUGAS_ROUTES_002", `unreachable: unhandled route kind at ${method} ${path}`);
  };

  const compiled: Record<string, unknown> = {};
  for (const [path, declarations] of declarationsByPath) {
    const anyClaims: Declaration[] = [];
    const methodClaims = new Map<string, MethodClaim>();

    for (const { owner, entry, moduleName } of declarations) {
      const plain = isPlainEntryObject(entry) ? entry : undefined;
      if (plain === undefined) {
        anyClaims.push({ owner, entry, moduleName });
        continue;
      }
      for (const [method, value] of Object.entries(plain)) {
        // M5R1-003: validate method keys against the supported set.
        // M6R1-010: "ALL" is rejected too — Bun 1.4.0 does not accept it as a
        // method-map key (raw TypeError at serve time), so accepting it here
        // would defer the failure past Lugas diagnostics.
        if (!VALID_METHODS.has(method)) {
          throw diagnostic(
            "LUGAS_ROUTES_002",
            `unsupported route entry at ${method} ${path}`,
            { hint: "use uppercase HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS — declare each method explicitly; there is no ALL key", context: { method, path } },
          );
        }
        const prior = methodClaims.get(method);
        if (prior !== undefined) {
          // Defensive: identical exact-method re-declarations are already
          // fatal in composition; assembly refuses them independently so no
          // caller can bypass ownership by reaching this layer directly.
          throw duplicateRoute(method, path, prior.owner, owner);
        }
        methodClaims.set(method, { owner, value, moduleName });
      }
    }

    if (anyClaims.length > 1) {
      throw duplicateRoute("*", path, anyClaims[0]!.owner, anyClaims[1]!.owner);
    }

    // M5R1 correction: empty method map must fail closed
    if (anyClaims.length === 0 && methodClaims.size === 0) {
      throw diagnostic("LUGAS_ROUTES_003", `unsupported route entry at ${path}: no valid handler found`, { context: { path } });
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
      const moduleName = anyClaims[0]!.moduleName;
      const kind = classifyRoute(entry);
      // Raw Bun semantics (M4R1-004): function values serve verbatim,
      // untouched by the framework pipeline.
      if (kind.kind === "native-handler") {
        compiled[path] = kind.handler;
        facts.push(makeFact({ method: "*", path, module: moduleName, kind: "native", native: "handler", validates: [], guards: [] }));
        continue;
      }
      // ADR-0017 #3: bare descriptors become one visible "*" lugas record.
      if (kind.kind === "lugas-descriptor") {
        const declared = descriptorFacts(kind.descriptor as unknown as Record<string, unknown>);
        facts.push(makeFact({ method: "*", path, module: moduleName, kind: "lugas", ...declared }));
      } else if (kind.kind === "native-response" || kind.kind === "native-file") {
        facts.push(makeFact({ method: "*", path, module: moduleName, kind: "native", native: "static", validates: [], guards: [] }));
      } else if (kind.kind === "native-dir") {
        facts.push(makeFact({ method: "*", path, module: moduleName, kind: "native", native: "directory", validates: [], guards: [] }));
      }
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
      methodMap[method] = compileMethodValue(method, path, claim.moduleName, claim.value);
    }
    compiled[path] = Object.freeze(methodMap);
  }

  return Object.freeze({
    bunRoutes: Object.freeze(freezeContainers(compiled)),
    notFound: config.notFound ?? defaultNotFound,
    facts: Object.freeze(facts),
  });
}
