/**
 * Descriptor-to-Bun-handler compilation (M1-009).
 *
 * A compiled route handler receives the native Bun request plus the base
 * context (request, services, params) and MUST return a native Response.
 * Parsing and guards arrive with M2; this stage only binds identity and
 * enforces the Response contract.
 */
import type { RouteDescriptor } from "../core/types";

export type CompiledRoute = {
  routeId: string;
  handler: (request: Request) => Response | Promise<Response>;
  isAsync: boolean;
};

export function compileRoute(
  routeId: string,
  descriptor: RouteDescriptor<never>,
  services: unknown,
): CompiledRoute {
  const userHandler = descriptor.handler as (context: {
    request: Request;
    services: unknown;
    params: Record<string, string>;
  }) => Response | Promise<Response>;
  const isAsync = userHandler.constructor.name !== "Function";
  const base = { services };
  if (isAsync) {
    return {
      routeId,
      isAsync: true,
      handler: async (request: Request) => {
        const params = (request as Request & { params?: Record<string, string> }).params ?? {};
        const out = await userHandler({ request, ...base, params });
        if (!(out instanceof Response)) {
          throw new TypeError(`Route ${routeId}: handler must return a native Response`);
        }
        return out;
      },
    };
  }
  return {
    routeId,
    isAsync: false,
    handler: (request: Request) => {
      const params = (request as Request & { params?: Record<string, string> }).params ?? {};
      const out = userHandler({ request, ...base, params });
      if (!(out instanceof Response)) {
        throw new TypeError(`Route ${routeId}: handler must return a native Response`);
      }
      return out;
    },
  };
}
