/**
 * WebSocket hub (M9-003, ADR-0028).
 *
 * Bun allows exactly one `websocket` handler per server; Lugas multiplexes
 * per-route handlers through the upgrade `data` key. The hub also tracks
 * open sockets so `lugasLifecycle.shutdown()` can close them with
 * `1001 Going Away` before the drain (Bun's graceful `stop()` leaves
 * WebSockets untouched — close-with-reason is the drain contract for
 * long-lived sockets, per the ADR-0020 deadline invariant).
 */
import { problem } from "../core/response";
import type { PipelineContext } from "./compile-pipeline";

const ROUTE_KEY = "__lugasRoute";
const CONTEXT_KEY = "__lugasContext";

export type WsData = {
  [ROUTE_KEY]: string;
  [CONTEXT_KEY]: PipelineContext;
};

export type WsRouteEntry = {
  message: (ws: Bun.ServerWebSocket<unknown>, message: string | Uint8Array, context: PipelineContext) => void | Promise<void>;
  open?: (ws: Bun.ServerWebSocket<unknown>, context: PipelineContext) => void | Promise<void>;
  close?: (ws: Bun.ServerWebSocket<unknown>, code: number, reason: string, context: PipelineContext) => void | Promise<void>;
  drain?: (ws: Bun.ServerWebSocket<unknown>, context: PipelineContext) => void | Promise<void>;
};

export type WebSocketHub = {
  /** routeId (`"${method} ${path}"`) → raw event handlers. Registered at prepare time. */
  readonly routes: Map<string, WsRouteEntry>;
  /** Filled by serveApp once `Bun.serve` returns; the compiled upgrade handler resolves the server lazily. */
  readonly serverRef: { current: Bun.Server<unknown> | undefined };
  /** Open Lugas sockets, for shutdown close-1001. */
  readonly sockets: Set<Bun.ServerWebSocket<unknown>>;
  /** The single Bun `websocket` handler object dispatching per route. */
  readonly bunHandler: () => Bun.WebSocketHandler<WsData>;
  /** Close every tracked socket; returns how many were open. */
  readonly closeAll: (code: number, reason: string) => number;
};

export function createWebSocketHub(): WebSocketHub {
  const routes = new Map<string, WsRouteEntry>();
  const serverRef: { current: Bun.Server<unknown> | undefined } = { current: undefined };
  const sockets = new Set<Bun.ServerWebSocket<unknown>>();

  const resolve = (ws: Bun.ServerWebSocket<WsData>): WsRouteEntry | undefined =>
    routes.get(ws.data?.[ROUTE_KEY] ?? "");

  const bunHandler = (): Bun.WebSocketHandler<WsData> => ({
    message: (ws, message) => {
      const route = resolve(ws);
      return route?.message(ws, message as string | Uint8Array, ws.data[CONTEXT_KEY]);
    },
    open: (ws) => {
      sockets.add(ws);
      const route = resolve(ws);
      return route?.open?.(ws, ws.data[CONTEXT_KEY]);
    },
    close: (ws, code, reason) => {
      sockets.delete(ws);
      const route = resolve(ws);
      return route?.close?.(ws, code, reason, ws.data[CONTEXT_KEY]);
    },
    drain: (ws) => {
      const route = resolve(ws);
      return route?.drain?.(ws, ws.data[CONTEXT_KEY]);
    },
  });

  const closeAll = (code: number, reason: string): number => {
    const count = sockets.size;
    for (const ws of sockets) {
      try {
        ws.close(code, reason);
      } catch {
        // Already closed by the peer — the shutdown contract is best-effort
        // close-with-reason, never a crash during shutdown.
      }
    }
    sockets.clear();
    return count;
  };

  return { routes, serverRef, sockets, bunHandler, closeAll };
}

/**
 * The request-time upgrade decision, used as the synthetic route handler for
 * websocket descriptors. Validation and guards have already run (this is the
 * pipeline's "handler"); a successful upgrade hijacks the request and Bun
 * discards the returned Response, so the pipeline's Response contract is
 * satisfied with an unsent `204`. A non-upgrade request gets `426`.
 */
export function performUpgrade(hub: WebSocketHub, routeId: string, context: PipelineContext): Response {
  const server = hub.serverRef.current;
  if (server === undefined) {
    return problem(503, { title: "Unavailable", status: 503, detail: "server is not accepting upgrades" });
  }
  const upgraded = server.upgrade(context.request, {
    data: { [ROUTE_KEY]: routeId, [CONTEXT_KEY]: context },
  });
  if (upgraded) return new Response(null, { status: 204 });
  return problem(426, {
    title: "Upgrade Required",
    status: 426,
    detail: "websocket routes accept only WebSocket handshake requests (GET with Upgrade: websocket)",
  });
}
