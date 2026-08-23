/**
 * Descriptor-to-Bun-handler compilation (M1-009, M2-010, M2-014, M4R1-004).
 *
 * Compiles a Lugas RouteDescriptor into a native Bun handler by assembling
 * the validation and guard pipeline.
 *
 * `isAsync` is advisory declarative metadata only (body pipeline declared or
 * handler has the intrinsic [[AsyncFunction]] toString tag — stable under
 * minification/rebinding, unlike constructor.name). Execution never trusts
 * it: the pipeline observes promise-ness from returned values at runtime.
 */
import type { RouteDescriptor } from "../core/types";
import { compilePipeline } from "./compile-pipeline";

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
  const rawHandler = descriptor.handler as unknown;
  const isAsync =
    (descriptor as any).body !== undefined ||
    (typeof rawHandler === "function" &&
      Object.prototype.toString.call(rawHandler) === "[object AsyncFunction]");
  const handler = compilePipeline(routeId, descriptor, services);
  return {
    routeId,
    isAsync,
    handler,
  };
}
