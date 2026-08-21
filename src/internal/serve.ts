/** Native Bun server assembly for `app.serve()` (M1-015). */
import { classifyRoute } from "./classify-route";
import { compileRoute } from "./compile-route";
import { withErrorPolicy, defaultNotFound, defaultOnError } from "./error-policy";
import type { AppConfig } from "../core/app";

export type SafeServeOptions = { port?: number | string; hostname?: string; development?: boolean; fetch?: (request: Request, server: Bun.Server<unknown>) => Response | Promise<Response>; routes?: Record<string, unknown>; [key: string]: unknown };

export function serveApp<TServices>(config: AppConfig<TServices>, options: SafeServeOptions = {}): Bun.Server<unknown> {
  const routeEntries: Record<string, unknown> = { ...(config.routes ?? {}) };
  for (const module_ of config.modules ?? []) {
    for (const [path, entry] of Object.entries(module_.routes)) routeEntries[path] = entry;
  }
  const compiled: Record<string, unknown> = {};
  for (const [path, entry] of Object.entries(routeEntries)) {
    const kind = classifyRoute(entry);
    if (kind.kind === "lugas-descriptor") {
      const routeId = `* ${path}`;
      const handler = compileRoute(routeId, kind.descriptor, config.services).handler;
      compiled[path] = withErrorPolicy(handler, config.onError ?? defaultOnError, routeId);
    } else if (kind.kind === "unsupported") {
      throw new Error(`unsupported route entry at ${path}`);
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
  const userFetch = options.fetch;
  const notFound = config.notFound ?? defaultNotFound;
  const bunOptions = {
    ...options,
    routes: compiled,
    fetch: userFetch ?? ((request: Request) => notFound(request)),
  };
  return Bun.serve(bunOptions as Bun.Serve.Options<any>);
}
