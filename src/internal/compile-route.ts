/**
 * Descriptor-to-Bun-handler compilation (M1-009, M2-010).
 *
 * Compiles a Lugas RouteDescriptor into a native Bun handler. Executes the
 * ordered guard sequence (if any) and invokes the user route handler.
 * Short-circuits immediately when a guard returns a native Response.
 * Preserves synchronous fast-path when guards and handler are synchronous.
 */
import type { GuardDescriptor, RouteDescriptor } from "../core/types";
import { runGuards } from "./run-guards";

export type CompiledRoute = {
  routeId: string;
  handler: (request: Request) => Response | Promise<Response>;
  isAsync: boolean;
};

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return false;
  return typeof (value as { readonly then?: unknown }).then === "function";
}

export function compileRoute(
  routeId: string,
  descriptor: RouteDescriptor<never>,
  services: unknown,
): CompiledRoute {
  const guards = descriptor.before ?? [];
  const userHandler = descriptor.handler as (context: {
    request: Request;
    services: unknown;
    params: Record<string, string>;
    [key: string]: unknown;
  }) => Response | Promise<Response>;
  const base = { services };

  if (guards.length === 0) {
    const isAsync = userHandler.constructor.name !== "Function";
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

  // Route has guards
  return {
    routeId,
    isAsync: true,
    handler: (request: Request) => {
      const params = (request as Request & { params?: Record<string, string> }).params ?? {};
      const guardResult = runGuards(guards as ReadonlyArray<GuardDescriptor<unknown, unknown>>, { request, services });

      if (isPromiseLike(guardResult)) {
        return Promise.resolve(guardResult).then(async (resolved) => {
          if (resolved.kind === "response") {
            return resolved.response;
          }
          const out = await userHandler({ request, ...base, params, ...resolved.context });
          if (!(out instanceof Response)) {
            throw new TypeError(`Route ${routeId}: handler must return a native Response`);
          }
          return out;
        });
      }

      if (guardResult.kind === "response") {
        return guardResult.response;
      }

      const out = userHandler({ request, ...base, params, ...guardResult.context });
      if (isPromiseLike(out)) {
        return Promise.resolve(out).then((resolvedOut) => {
          if (!(resolvedOut instanceof Response)) {
            throw new TypeError(`Route ${routeId}: handler must return a native Response`);
          }
          return resolvedOut;
        });
      }

      if (!(out instanceof Response)) {
        throw new TypeError(`Route ${routeId}: handler must return a native Response`);
      }
      return out;
    },
  };
}
