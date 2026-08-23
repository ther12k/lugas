/** Native Bun server assembly for `app.serve()` (M1-015, M4R1-001). */
import type { PreparedApp, SafeServeOptions } from "./prepared-app";

export type { SafeServeOptions } from "./prepared-app";

/**
 * Starts a Bun server from the canonical prepared graph. Never reads user
 * configuration: routing structure was snapshotted, classified, and compiled
 * exactly once inside `defineApp()` (see prepareApp).
 */
export function serveApp(prepared: PreparedApp, options: SafeServeOptions = {}): Bun.Server<unknown> {
  const userFetch = options.fetch;
  const notFound = prepared.notFound;
  const bunOptions = {
    ...options,
    routes: prepared.bunRoutes,
    fetch: userFetch ?? ((request: Request) => notFound(request)),
  };
  return Bun.serve(bunOptions as Bun.Serve.Options<any>);
}
