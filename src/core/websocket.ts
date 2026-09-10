/**
 * `websocket()` descriptor factory (M9-003, ADR-0028).
 *
 * A websocket route decides the upgrade through the ordinary compiled
 * pipeline — `before` guards short-circuit the handshake with a real HTTP
 * response, params/query/headers schemas validate before the upgrade — and
 * hands Bun's native `ServerWebSocket` to the event handlers unwrapped.
 * Lugas never wraps or proxies the socket: `send`, `subscribe`/`publish`,
 * `ping`/`pong`, `binaryType` are Bun's API used directly.
 *
 * Local invariants are checked at creation so misconfiguration fails at
 * startup, not on a socket: `message` is required (a socket that cannot
 * respond to input has no server-side reason to exist) and unknown keys are
 * rejected — typos must not pass silently.
 */
import { diagnostic } from "../internal/diagnostics";
import { brand } from "../internal/brands";
import type { GuardDescriptor } from "./types";
import type { RouteContext } from "../internal/context";

/**
 * Messages arrive as text (`string`) or binary per the socket's `binaryType`
 * (Bun's `Buffer` is a `Uint8Array` subclass, so `Uint8Array` covers it).
 */
export type WebSocketMessage = string | Uint8Array;

/** Bun's native server-side socket, passed through unwrapped. */
export type ServerWebSocketLike = Bun.ServerWebSocket<unknown>;

/**
 * Event-handler context: the same shape route handlers receive (services,
 * validated slots, ordered guard enrichments) — derived from the descriptor,
 * never manually annotated. There is no `body` slot: the upgrade handshake
 * carries no framework-parsed body.
 */
export type WebSocketEventContext<
  TServices,
  TParams,
  TQuery,
  THeaders,
  TGuards extends ReadonlyArray<GuardDescriptor<TServices, any>>,
> = RouteContext<TServices, TParams, TQuery, THeaders, undefined, TGuards>;

export type WebSocketConfig<
  TServices = unknown,
  TParams = undefined,
  TQuery = undefined,
  THeaders = undefined,
  TGuards extends ReadonlyArray<GuardDescriptor<TServices, any>> = ReadonlyArray<GuardDescriptor<TServices, never>>,
> = {
  /** Ordered guards, run before the upgrade decision. A returned `Response` rejects the handshake with that response. */
  before?: TGuards;
  /** Validates path params before the upgrade; failures return ordinary `422` Problem Details. */
  params?: TParams;
  /** Validates the query string before the upgrade. */
  query?: TQuery;
  /** Validates request headers before the upgrade (lowercase names). */
  headers?: THeaders;
  /** Required. Receives the native socket and the message as text or binary. */
  message: (ws: ServerWebSocketLike, message: WebSocketMessage, context: WebSocketEventContext<TServices, TParams, TQuery, THeaders, TGuards>) => void | number | Promise<void> | Promise<number>;
  /** The socket completed the handshake and is open. */
  open?: (ws: ServerWebSocketLike, context: WebSocketEventContext<TServices, TParams, TQuery, THeaders, TGuards>) => void | number | Promise<void> | Promise<number>;
  /** The socket closed (by either side, or by Lugas during shutdown with code 1001). */
  close?: (ws: ServerWebSocketLike, code: number, reason: string, context: WebSocketEventContext<TServices, TParams, TQuery, THeaders, TGuards>) => void | number | Promise<void> | Promise<number>;
  /** The socket left backpressure and is ready to send again. */
  drain?: (ws: ServerWebSocketLike, context: WebSocketEventContext<TServices, TParams, TQuery, THeaders, TGuards>) => void | number | Promise<void> | Promise<number>;
};

const WEBSOCKET_KEYS = new Set(["before", "params", "query", "headers", "message", "open", "close", "drain"]);

export function websocket<
  TServices = unknown,
  const TParams = undefined,
  const TQuery = undefined,
  const THeaders = undefined,
  const TGuards extends ReadonlyArray<GuardDescriptor<any, any>> = readonly [],
>(
  config: WebSocketConfig<TServices, TParams, TQuery, THeaders, TGuards>,
): WebSocketConfig<TServices, TParams, TQuery, THeaders, TGuards> {
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_WS_001", "websocket(): config must be an object", { hint: "pass websocket({ message }) with optional before/params/query/headers/open/close/drain" });
  }
  for (const key of Object.keys(config)) {
    if (!WEBSOCKET_KEYS.has(key)) {
      throw diagnostic("LUGAS_WS_001", `websocket(): unknown config key '${key}'`, {
        hint: "allowed keys: before, params, query, headers, message, open, close, drain",
        context: { key },
      });
    }
  }
  if (typeof config.message !== "function") {
    throw diagnostic("LUGAS_WS_001", "websocket(): 'message' must be a function", { hint: "message(ws, message, context) is the one required handler" });
  }
  if (config.before !== undefined) {
    if (!Array.isArray(config.before)) {
      throw diagnostic("LUGAS_WS_001", "websocket(): 'before' must be an array of guard descriptors", { hint: "list guards in execution order: before: [authGuard]" });
    }
    for (const g of config.before) {
      if (typeof g !== "object" || g === null || typeof (g as GuardDescriptor).name !== "string" || typeof (g as GuardDescriptor).handler !== "function") {
        throw diagnostic("LUGAS_WS_001", "websocket(): 'before' entries must be guard() descriptors", { hint: "create guards with guard({ name, handler })" });
      }
    }
  }
  return brand(Object.freeze({ ...config }), "WebSocketDescriptor");
}
