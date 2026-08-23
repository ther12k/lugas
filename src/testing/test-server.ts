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
import type { LugasAppInstance } from "../core/app";

const ALLOWED_OPTION_KEYS = new Set(["port", "hostname", "development"]);

export type TestServerOptions = {
  /** Explicit port; defaults to an ephemeral port (0). */
  readonly port?: number;
  readonly hostname?: string;
  readonly development?: boolean;
};

export type TestServer = {
  readonly port: number;
  /** Base URL, no trailing slash. */
  readonly url: string;
  readonly server: Bun.Server<unknown>;
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
): TestServer {
  rejectForbiddenOptions(options as Record<string, unknown>);
  const server = app.serve({ port: options.port ?? 0, development: options.development ?? false });
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

  const handle: TestServer = {
    port: server.port ?? 0,
    url: base.origin,
    server,
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
