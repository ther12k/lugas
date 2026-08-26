/** Native Bun server assembly for `app.serve()` (M1-015, M4R1-001). */
import { defaultNotFound } from "./error-policy";
import type { PreparedApp, SafeServeOptions } from "./prepared-app";

export type { SafeServeOptions } from "./prepared-app";

/**
 * Second-line fallback for a failing CUSTOM notFound policy (M6R2 #288),
 * mirroring the onError redaction contract from M6R1-008: throw, rejection,
 * or non-Response falls back to the default redacted 404 problem — never
 * Bun's development error page.
 */
function safeNotFound(
  policy: (request: Request) => Response | Promise<Response>,
): (request: Request) => Response | Promise<Response> {
  return (request: Request) => {
    if (policy === defaultNotFound) return defaultNotFound(request);
    try {
      const result = policy(request);
      if (!(result instanceof Response) && result != null && typeof (result as PromiseLike<unknown>).then === "function") {
        return Promise.resolve(result)
          .then((resolved) => (resolved instanceof Response ? resolved : defaultNotFound(request)))
          .catch(() => defaultNotFound(request));
      }
      return result instanceof Response ? result : defaultNotFound(request);
    } catch {
      return defaultNotFound(request);
    }
  };
}

/**
 * Starts a Bun server from the canonical prepared graph. Never reads user
 * configuration: routing structure was snapshotted, classified, and compiled
 * exactly once inside `defineApp()` (see prepareApp).
 */
export function serveApp(prepared: PreparedApp, options: SafeServeOptions = {}): Bun.Server<unknown> {
  const userFetch = options.fetch;
  const bunOptions = {
    ...options,
    routes: prepared.bunRoutes,
    fetch: userFetch ?? ((request: Request) => safeNotFound(prepared.notFound)(request)),
  };
  return Bun.serve(bunOptions as Bun.Serve.Options<any>);
}
