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
import type { AssetsConfig } from "../internal/assets";
import { compileCorsPolicy, type CompiledCorsPolicy, type CorsConfig } from "../internal/cors";
import { compileLogging, type CompiledLogging, type LoggingConfig } from "../internal/logging";
import { compileOpenApiConfig, type CompiledOpenApi, type OpenApiConfig } from "../internal/openapi";
import { compileHealthConfig, compileSecureHeaders, type HealthConfig, type SecureHeadersConfig } from "../internal/production";
import { compileTelemetry, type TelemetryConfig } from "../internal/telemetry";
import type { LugasApp, MergeModulesRoutes, ModuleDescriptor } from "./types";
import { serveApp } from "../internal/serve";
import { assertValidRoutePath } from "../internal/path";

export type AppConfig<TServices, TRoutes = Readonly<Record<string, unknown>>> = {
  services?: TServices;
  routes?: TRoutes;
  modules?: ReadonlyArray<ModuleDescriptor<TServices, any>>;
  /**
   * Opt-in public asset serving (ADR-0018): explicit file mappings and
   * directory mounts under explicit URL prefixes, served natively by Bun
   * through GET/HEAD. Ownership conflicts with API routes are rejected at
   * startup. Absent assets leave every behavior unchanged.
   */
  assets?: AssetsConfig;
  /**
   * Application-default body budget in bytes (M7-003, ADR-0019). Applied to
   * routes with a declared framework-parsed body when the route declares no
   * own `budget`; clamped by the serve-time `maxRequestBodySize` ceiling.
   */
  bodyBudget?: number;
  /**
   * First-party CORS policy (M8-001, ADR-0022): opt-in, app-level, fail-closed.
   * When configured, every response carries `Vary: Origin`, allowed origins
   * receive `Access-Control-*` headers, preflights are answered before
   * application handlers, and pipeline-bypass route kinds (static `Response`,
   * `Bun.file`, `{ dir }`, `assets`) are rejected at startup. Absent `cors`
   * leaves every behavior unchanged.
   */
  cors?: CorsConfig;
  /**
   * Structured logging contract and access facility (M8-003, ADR-0024).
   * App-level, opt-in: `level` (default "info"), `sink` (Pino/OTel integration
   * point), `requestIds` (x-request-id response header + logged), and `access`
   * (per-request entry with method, path, route, status, durationMs).
   * Redaction by construction: scalar-only fields; headers/bodies/cookies
   * are never logged by framework entries.
   */
  logging?: LoggingConfig;
  /**
   * OpenAPI 3.1 generation and Scalar reference UI (M8-004, ADR-0025).
   * Generates a canonical OpenAPI 3.1 JSON document from routing facts and
   * declared schemas, served at `path` (default `/openapi.json`), with an
   * optional zero-dependency Scalar CDN HTML shell served at `ui.path`
   * (default `/docs`).
   */
  openapi?: OpenApiConfig;
  /**
   * Conservative security-header policy (M9-004, ADR-0029): opt-in,
   * app-level, fill-if-absent on every pipeline response. Defaults when
   * enabled: X-Content-Type-Options nosniff, X-Frame-Options DENY,
   * Referrer-Policy strict-origin-when-cross-origin. CSP and HSTS are
   * strictly opt-in; the framework never invents a Content-Security-Policy.
   */
  secureHeaders?: SecureHeadersConfig;
  /**
   * Lifecycle-aware health endpoints (M9-004, ADR-0029): opt-in GET
   * liveness (`/health`, bypasses the traffic gate — a booting process is
   * alive) and readiness (`/ready`, awaits the gate — 200 after init,
   * 503 while held or after a startup failure). Paths are renamable;
   * collisions with routes or assets fail closed at startup.
   */
  health?: HealthConfig;
  /**
   * Dependency-free telemetry hooks (M9-006, ADR-0032): opt-in
   * `onRequestStart`/`onRequestEnd` callbacks receiving scalar-only events
   * (method, path, route, requestId; end adds status, durationMs,
   * errorClass). Request-end includes `track(task, request)`-correlated
   * work. Span export is application-owned (docs/telemetry.md recipe).
   */
  telemetry?: TelemetryConfig;
  notFound?: (request: Request) => Response | Promise<Response>;
  onError?: (error: unknown, request: Request) => Response | Promise<Response>;
};

const APP_KEYS = new Set(["services", "routes", "modules", "assets", "bodyBudget", "cors", "logging", "openapi", "secureHeaders", "health", "telemetry", "notFound", "onError"]);

export type AppInternals<TServices = unknown> = {
  readonly composition: Composition;
  /** Frozen runtime-truth manifest (lugas-manifest-v1) — reading starts no server. */
  readonly manifest: LugasManifestV1;
  /** Canonical prepared graph — the only input `serveApp()` consumes. */
  readonly prepared: PreparedApp;
};

export type LugasAppInstance<TServices = unknown, TRoutes = unknown> = LugasApp<TServices, TRoutes> & {
  readonly manifest: AppInternals<TServices>["manifest"];
  readonly serve: (options?: import("../internal/serve").SafeServeOptions) => import("../internal/serve").LugasServer;
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

  // M6R2 #286: route-map SHAPE first (null/arrays/non-objects get the stable
  // LUGAS_APP_006 diagnostic, never a native TypeError), then per-path syntax
  // through the shared canonical validator (M5R1; M6R1-011).
  if (config.routes !== undefined) {
    if (typeof config.routes !== "object" || config.routes === null || Array.isArray(config.routes)) {
      throw diagnostic("LUGAS_APP_006", "defineApp(): 'routes' must be an object keyed by full path", { hint: 'use string paths like "/users/:id"' });
    }
    for (const [path] of Object.entries(config.routes)) {
      assertValidRoutePath(path, "app");
    }
  }

  // M5R1: validate error/notFound policies are functions
  if (config.onError !== undefined && typeof config.onError !== 'function') {
    throw diagnostic('LUGAS_APP_002', "defineApp(): 'onError' must be a function", { context: { key: 'onError' } });
  }
  if (config.notFound !== undefined && typeof config.notFound !== 'function') {
    throw diagnostic('LUGAS_APP_002', "defineApp(): 'notFound' must be a function", { context: { key: 'notFound' } });
  }
  for (const key of Object.keys(config)) {
    if (!APP_KEYS.has(key)) {
      throw diagnostic("LUGAS_APP_002", `defineApp(): unknown config key '${key}'`, { hint: "allowed keys: services, routes, modules, assets, bodyBudget, cors, logging, openapi, notFound, onError", context: { key } });
    }
  }
  if (config.bodyBudget !== undefined && (typeof config.bodyBudget !== "number" || !Number.isInteger(config.bodyBudget) || config.bodyBudget <= 0)) {
    throw diagnostic("LUGAS_BODY_001", "defineApp(): 'bodyBudget' must be a positive integer number of bytes", {
      hint: "bodyBudget is the application default; per-route budgets override it, the server ceiling always wins",
      context: { key: "bodyBudget" },
    });
  }
  // M8-001 (ADR-0022): validate once here; preparation consumes the compiled
  // policy and never re-reads user configuration.
  const corsPolicy: CompiledCorsPolicy | undefined = config.cors !== undefined ? compileCorsPolicy(config.cors) : undefined;
  // M8-003 (ADR-0024): validate logging once here; preparation wraps handlers.
  const loggingConfig: CompiledLogging | undefined = config.logging !== undefined ? compileLogging(config.logging) : undefined;
  // M8-004 (ADR-0025): validate openapi config once here.
  const openApiConfig: CompiledOpenApi | undefined = config.openapi !== undefined ? compileOpenApiConfig(config.openapi) : undefined;
  // M9-004 (ADR-0029): validate once here; preparation consumes the compiled
  // policy and health paths, never re-reading user configuration.
  const secureHeaders = config.secureHeaders !== undefined ? compileSecureHeaders(config.secureHeaders) : undefined;
  const health = config.health !== undefined ? compileHealthConfig(config.health) : undefined;
  const telemetry = config.telemetry !== undefined ? compileTelemetry(config.telemetry) : undefined;
  if (config.modules !== undefined) {
    if (!Array.isArray(config.modules)) throw diagnostic("LUGAS_APP_003", "defineApp(): 'modules' must be an array", { hint: "wrap modules: modules: [defineModule(...)]" });
    const names = new Set<string>();
    for (const module_ of config.modules) {
      // M6R2 #287: full structural shape — name AND a routes map.
      if (
        typeof module_ !== "object" || module_ === null ||
        typeof (module_ as ModuleDescriptor<TServices>).name !== "string" ||
        typeof (module_ as ModuleDescriptor<TServices>).routes !== "object" ||
        (module_ as ModuleDescriptor<TServices>).routes === null
      ) {
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
    assets: config.assets,
    bodyBudget: config.bodyBudget,
    cors: corsPolicy,
    logging: loggingConfig,
    openapi: openApiConfig,
    secureHeaders,
    health,
    telemetry,
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
