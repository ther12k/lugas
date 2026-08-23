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

export function defaultOnError(error: unknown, request: Request, routeId?: string): Response {
  // Redacted: only a stable internal identifier is exposed. The thrown value
  // is not serialized into the response and never leaves the wrapper mutated;
  // the route identity arrives via closure, not by tagging the error.
  const identity = typeof routeId === "string" ? routeId : "unspecified";
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
/**
 * Wrap a compiled handler with an error policy (M4R1-007).
 *
 * The wrapper is a plain function: fully-synchronous handlers resolve and
 * return synchronously — no Promise chaining is added at the production
 * boundary. Only promise-like results take the rejection path.
 *
 * Thrown values are NEVER mutated: route identity reaches the default policy
 * through wrapper closure instead of `Object.assign` onto the error, which
 * would throw on frozen errors inside catch and bypass redaction entirely
 * (leaving Bun's development error page to render message + stack).
 */
export function withErrorPolicy<T extends (request: Request) => Response | Promise<Response>>(
  handler: T,
  onError: ErrorPolicy,
  routeId: string,
): (request: Request) => Response | Promise<Response> {
  const handleError = (error: unknown, request: Request): Response | Promise<Response> =>
    onError === defaultOnError ? defaultOnError(error, request, routeId) : onError(error, request);
  return function withErrorPolicyHandler(request: Request): Response | Promise<Response> {
    try {
      const result = handler(request);
      if (!(result instanceof Response) && isPromiseLike(result)) {
        return Promise.resolve(result).catch((cause: unknown) => handleError(cause, request));
      }
      return result;
    } catch (error) {
      return handleError(error, request);
    }
  };
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return false;
  return typeof (value as { readonly then?: unknown }).then === "function";
}
