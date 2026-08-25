/**
 * Bun-native test server lifecycle helper (M4-006).
 *
 * Wraps the production `app.serve()` path with deterministic test ergonomics:
 * ephemeral port by default, relative-path `fetch`, exposed native server,
 * and an idempotent async stop that force-closes connections so fixtures can
 * detect released handles.
 *
 * Route/fallback/error overrides are rejected at creation — tests exercise
 * exactly what production serves. Built on public surface only: it calls
 * `app.serve()`, never internal compilation.
 */
import { diagnostic } from "../internal/diagnostics";
import { createClient } from "../client/create-client";
import type { LugasClient } from "../client/create-client";
import type { AppContract } from "../core/contract";
import type { LugasAppInstance } from "../core/app";

const ALLOWED_OPTION_KEYS = new Set(["port", "hostname", "development"]);

export type TestServerOptions = {
  /** Explicit port; defaults to an ephemeral port (0). */
  readonly port?: number;
  readonly hostname?: string;
  readonly development?: boolean;
};

export type TestServer<TClient = unknown> = {
  readonly port: number;
  /** Base URL, no trailing slash. */
  readonly url: string;
  readonly server: Bun.Server<unknown>;
  /**
   * The REAL typed client (lugas/client implementation) bound to this
   * server: no testing clone, no duplicated URL/response logic.
   */
  readonly client: TClient;
  /**
   * Fetch against this server. Relative paths ("​/users") resolve against
   * the base URL; absolute URLs and Request inputs pass through untouched.
   */
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  /** Idempotent: force-closes connections; safe after failures. */
  stop: () => Promise<void>;
  /** Alias of stop for cleanup-fixture ergonomics. */
  dispose: () => Promise<void>;
};

function rejectForbiddenOptions(options: Record<string, unknown>): void {
  for (const key of Object.keys(options)) {
    if (!ALLOWED_OPTION_KEYS.has(key)) {
      throw diagnostic("LUGAS_TEST_001", `createTestServer(): forbidden option '${key}'`, {
        hint: "the test server inherits routes/errors from the app; configure them via defineApp/route/guard",
        context: { key },
      });
    }
  }
}

export function createTestServer<TServices, TRoutes>(
  app: LugasAppInstance<TServices, TRoutes>,
  options: TestServerOptions = {},
): TestServer<LugasClient<AppContract<LugasAppInstance<TServices, TRoutes>>>> {
  rejectForbiddenOptions(options as Record<string, unknown>);
  const serveOpts: Record<string, unknown> = { port: options.port ?? 0, development: options.development ?? false };
  if (options.hostname !== undefined) serveOpts.hostname = options.hostname;
  const server = app.serve(serveOpts as never);
  const base = new URL(server.url);

  let stopped = false;
  async function stop(): Promise<void> {
    if (stopped) {
      return;
    }
    stopped = true;
    // Force-close so fixtures observe released handles immediately.
    server.stop(true);
    // Yield once so pending accept loops settle before assertions run.
    await Promise.resolve();
  }

  const boundFetch = ((input: string | URL | Request, init?: RequestInit) => {
    const resolved =
      typeof input === "string" && input.startsWith("/") ? new URL(input, base.origin) : input;
    return globalThis.fetch(resolved, init);
  }) as unknown as typeof fetch;
  const client = createClient<AppContract<LugasAppInstance<TServices, TRoutes>>>({
    baseUrl: base.origin,
    fetch: boundFetch,
  });

  const handle: TestServer<LugasClient<AppContract<LugasAppInstance<TServices, TRoutes>>>> = {
    port: server.port ?? 0,
    url: base.origin,
    server,
    client,
    fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
      const resolved =
        typeof input === "string" && input.startsWith("/") ? new URL(input, base.origin) : input;
      return globalThis.fetch(resolved, init);
    },
    stop,
    dispose: stop,
  };
  return Object.freeze(handle);
}
