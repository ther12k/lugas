/**
 * Server-Sent Events response helper (M8-002, ADR-0023).
 *
 * A native streaming `text/event-stream` Response built on web streams. The
 * `start(writer)` callback registers the producer and may return a cleanup
 * function, which runs exactly once when the stream ends by any path:
 * `writer.close()`, client disconnect (`request.signal` abort cancels the
 * stream — pinned by probe on Bun 1.4.0), or server force-close. The helper
 * owns the opt-in heartbeat timer and clears it on the same cleanup path.
 *
 * Primitive, not product (ADR-0023): no broker, no fan-out, no replay, no
 * reconnect state. `last-event-id` is an ordinary request header that
 * applications read themselves.
 */
import { diagnostic } from "../internal/diagnostics";

/** One event frame's input. `data` is a string (one `data:` line per source line) or a JSON-serializable value. */
export type SseEventInput = {
  data: string | number | boolean | null | object;
  event?: string;
  id?: string | number;
  retry?: number;
};

/** Producer handle handed to `start`. Send methods return `false` once the stream has ended instead of throwing. */
export type SseWriter = {
  /** Mirrors the underlying stream's `desiredSize`; `null` once ended. Producers flooding a stalled client buffer unboundedly — respect this for unbounded streams. */
  readonly desiredSize: number | null;
  send(input: SseEventInput): boolean;
  comment(text: string): boolean;
  retry(ms: number): boolean;
  close(): void;
};

/** `sse()` configuration. `start` runs synchronously during `sse()`; a returned function is the deterministic cleanup. */
export type SseConfig = {
  start: (writer: SseWriter) => void | (() => void);
  /** Opt-in comment-heartbeat interval in milliseconds; owned and cleared by the helper. */
  heartbeatMs?: number;
};

/** Characters that would corrupt the SSE field framing if allowed in field values. */
const FORBIDDEN_FIELD_CHARS = /[\r\n]/;

function sseError(code: "LUGAS_SSE_001" | "LUGAS_SSE_002", message: string, hint: string): never {
  throw diagnostic(code, message, { hint });
}

function requireValidEventName(event: string): void {
  if (typeof event !== "string" || event === "" || FORBIDDEN_FIELD_CHARS.test(event)) {
    sseError("LUGAS_SSE_002", "sse(): event name must be a non-empty string without newlines", "use named events like event: \"tick\"");
  }
}

function serializeData(data: SseEventInput["data"]): string {
  if (typeof data === "string") return data;
  if (typeof data === "number" || typeof data === "boolean" || data === null) return JSON.stringify(data);
  if (typeof data !== "object") {
    sseError("LUGAS_SSE_002", "sse(): event data must be a string, number, boolean, null, or a JSON-serializable object", "objects are serialized with JSON.stringify semantics");
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(data);
  } catch (error) {
    sseError("LUGAS_SSE_002", `sse(): event data is not JSON-serializable: ${error instanceof Error ? error.message : String(error)}`, "remove bigint values (they have no JSON representation) or circular references");
  }
  if (serialized === undefined) {
    // JSON.stringify returns undefined for lone undefined/function/symbol —
    // unreachable for plain objects given the typeof guard above, but the
    // failure must stay a stable diagnostic, never a raw `data: undefined`.
    sseError("LUGAS_SSE_002", "sse(): event data serializes to no JSON text", "pass a string, number, boolean, null, or an object");
  }
  return serialized;
}

/**
 * Pure SSE frame serializer: field order `id`, `event`, `retry`, then one
 * `data:` line per source line (CRLF/CR normalized to LF), frame terminated
 * by a blank line. Shared by the writer, tests, and alternate transports.
 */
export function formatSseEvent(input: SseEventInput): string {
  if (typeof input !== "object" || input === null) {
    sseError("LUGAS_SSE_002", "sse(): event input must be an object with a data field", 'pass { data: "..." }');
  }
  if (!("data" in input) || input.data === undefined) {
    sseError("LUGAS_SSE_002", "sse(): event input requires a data field", 'pass { data: "..." } — a frame without data is not an event');
  }
  let frame = "";
  if (input.id !== undefined) {
    if (typeof input.id !== "string" && typeof input.id !== "number") {
      sseError("LUGAS_SSE_002", "sse(): event id must be a string or number", "ids go into the last-event-id header on reconnect");
    }
    const id = String(input.id);
    if (FORBIDDEN_FIELD_CHARS.test(id)) {
      sseError("LUGAS_SSE_002", "sse(): event id must not contain newlines", "ids are single-line field values");
    }
    frame += `id: ${id}\n`;
  }
  if (input.event !== undefined) {
    requireValidEventName(input.event);
    frame += `event: ${input.event}\n`;
  }
  if (input.retry !== undefined) {
    if (typeof input.retry !== "number" || !Number.isInteger(input.retry) || input.retry < 0) {
      sseError("LUGAS_SSE_002", "sse(): event retry must be a non-negative integer number of milliseconds", "example: retry: 3000");
    }
    frame += `retry: ${input.retry}\n`;
  }
  const data = serializeData(input.data).replace(/\r\n|\r/g, "\n");
  for (const line of data.split("\n")) {
    frame += `data: ${line}\n`;
  }
  return frame + "\n";
}

/** The exact response headers of an `sse()` stream. */
const SSE_RESPONSE_HEADERS = { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" } as const;

/**
 * Opens an SSE response. `start(writer)` runs synchronously inside `sse()`
 * — before any wire bytes — so a throw propagates to the route's error
 * policy (a redacted 500 problem), never the silent empty-200 a mid-stream
 * error would produce (pinned by probe, ADR-0023). Its optional cleanup runs
 * exactly once on close, client disconnect, or server force-close (Bun
 * aborts `request.signal` and cancels the response stream). An open stream
 * is in-flight work for the ADR-0020 drain: applications that must exit
 * promptly close their writers on shutdown. Response headers flush with the
 * first written byte — send an initial event, `retry`, or comment promptly.
 */
export function sse(config: SseConfig): Response {
  if (typeof config !== "object" || config === null) {
    sseError("LUGAS_SSE_001", "sse(): config must be an object", "pass sse({ start(writer) { ... } })");
  }
  const keys = Object.keys(config);
  for (const key of keys) {
    if (key !== "start" && key !== "heartbeatMs") {
      sseError("LUGAS_SSE_001", `sse(): unknown config key '${key}'`, "allowed keys: start, heartbeatMs");
    }
  }
  if (typeof config.start !== "function") {
    sseError("LUGAS_SSE_001", "sse(): 'start' must be a function", "start(writer) registers the producer; return a cleanup function to run when the stream ends");
  }
  if (config.heartbeatMs !== undefined && (typeof config.heartbeatMs !== "number" || !Number.isInteger(config.heartbeatMs) || config.heartbeatMs <= 0)) {
    sseError("LUGAS_SSE_001", "sse(): 'heartbeatMs' must be a positive integer number of milliseconds", "example: heartbeatMs: 15000");
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;
  let cleanedUp = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const state = { closed: false };

  const stopHeartbeat = (): void => {
    if (heartbeat !== undefined) {
      clearInterval(heartbeat);
      heartbeat = undefined;
    }
  };
  const runCleanup = (): void => {
    stopHeartbeat();
    if (cleanup !== undefined && !cleanedUp) {
      cleanedUp = true;
      cleanup();
    }
  };
  const enqueueOrFalse = (text: string): boolean => {
    if (state.closed) return false;
    try {
      controller.enqueue(encoder.encode(text));
      return true;
    } catch {
      return false;
    }
  };

  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start: (streamController) => {
      controller = streamController;
    },
    cancel: () => {
      state.closed = true;
      runCleanup();
    },
  });

  const writer: SseWriter = {
    get desiredSize(): number | null {
      return state.closed ? null : controller.desiredSize;
    },
    send(input: SseEventInput): boolean {
      return enqueueOrFalse(formatSseEvent(input));
    },
    comment(text: string): boolean {
      if (typeof text !== "string" || FORBIDDEN_FIELD_CHARS.test(text)) {
        sseError("LUGAS_SSE_002", "sse(): comment must be a string without newlines", "comments are single lines, e.g. writer.comment(\"heartbeat\")");
      }
      return enqueueOrFalse(`: ${text}\n\n`);
    },
    retry(ms: number): boolean {
      if (typeof ms !== "number" || !Number.isInteger(ms) || ms < 0) {
        sseError("LUGAS_SSE_002", "sse(): retry must be a non-negative integer number of milliseconds", "example: writer.retry(3000)");
      }
      return enqueueOrFalse(`retry: ${ms}\n\n`);
    },
    close(): void {
      if (state.closed) return;
      state.closed = true;
      stopHeartbeat();
      try {
        controller.close();
      } catch {
        // Already errored (cancel raced close); the cleanup below still runs.
      }
      runCleanup();
    },
  };

  const returned = config.start(writer);
  if (typeof returned === "function") {
    cleanup = returned;
    // start() may have ended its own stream synchronously (close() or a
    // racing cancel) before returning the cleanup — run it immediately.
    if (state.closed) runCleanup();
  }
  // No heartbeat when start() already ended the stream synchronously:
  // cleanup has run by then, so a timer created here would never be
  // cleared and would fire against a closed controller forever (CA-2).
  if (config.heartbeatMs !== undefined && !state.closed) {
    heartbeat = setInterval(() => {
      enqueueOrFalse(": heartbeat\n\n");
    }, config.heartbeatMs);
  }

  return new Response(stream, { headers: { ...SSE_RESPONSE_HEADERS } });
}
