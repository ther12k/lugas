/** Base request context passed to every compiled route handler. */
import type { RouteHandler } from "../core/types";

export type BaseContext<TServices = unknown, TParams extends Record<string, string> = Record<string, string>> = {
  readonly request: Request;
  readonly services: TServices;
  readonly params: TParams;
};

export function createContext<TServices, TParams extends Record<string, string>>(
  request: Request,
  services: TServices,
  params: TParams,
): BaseContext<TServices, TParams> {
  return { request, services, params };
}

export type ContextualHandler<TServices, TParams extends Record<string, string> = Record<string, string>> =
  RouteHandler<TServices, BaseContext<TServices, TParams>>;
