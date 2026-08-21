/**
 * Descriptor-to-Bun-handler compilation (M1-009, M2-010, M2-014).
 *
 * Compiles a Lugas RouteDescriptor into a native Bun handler by assembling
 * the validation and guard pipeline.
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
  const isAsync =
    (descriptor.handler as any).constructor.name !== "Function" ||
    (descriptor as any).body !== undefined;
  const handler = compilePipeline(routeId, descriptor, services);
  return {
    routeId,
    isAsync,
    handler,
  };
}
