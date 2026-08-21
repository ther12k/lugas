/**
 * Default not-found and unexpected-error policies (M1-014).
 *
 * - 404 is a single fallback response; no secondary route lookup.
 * - Unknown thrown values become a redacted production 500 problem: the
 *   error value itself never reaches the client or default logs verbatim.
 * - App-provided policies must return a native Response.
 */
import { problem } from "../core/response";

export type NotFoundPolicy = (request: Request) => Response | Promise<Response>;
export type ErrorPolicy = (error: unknown, request: Request) => Response | Promise<Response>;

export function defaultNotFound(_request: Request): Response {
  return problem(404, { title: "Not Found" });
}

export function defaultOnError(error: unknown, request: Request): Response {
  // Redacted: only a stable internal identifier is exposed. The thrown value
  // is not serialized into the response.
  const identity = typeof (error as { routeId?: unknown })?.routeId === "string"
    ? (error as { routeId: string }).routeId
    : "unspecified";
  console.error(`[lugas] unexpected error on ${request.method} ${new URL(request.url).pathname} (route: ${identity})`);
  return problem(500, { title: "Internal Server Error" });
}

export function resolvePolicies(config: {
  notFound?: NotFoundPolicy | undefined;
  onError?: ErrorPolicy | undefined;
}): { notFound: NotFoundPolicy; onError: ErrorPolicy } {
  const notFound = config.notFound ?? defaultNotFound;
  const onError = config.onError ?? defaultOnError;
  for (const [name, policy] of [["notFound", notFound], ["onError", onError]] as const) {
    if (typeof policy !== "function") {
      throw new Error(`defineApp(): '${name}' policy must be a function returning a native Response`);
    }
  }
  return { notFound, onError };
}

/**
 * Wrap a compiled handler with an error policy. Raw Bun route errors render
 * a development error page that embeds the thrown message and stack; Lugas
 * must intercept and redact (observed on Bun 1.4.0, tests/security).
 */
export function withErrorPolicy<T extends (request: Request) => Response | Promise<Response>>(
  handler: T,
  onError: ErrorPolicy,
  routeId: string,
): (request: Request) => Response | Promise<Response> {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      const enriched = error instanceof Error ? Object.assign(error, { routeId }) : error;
      return onError(enriched, request);
    }
  };
}
