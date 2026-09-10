/**
 * Rate-limit guard contract (M9-008, ADR-0034).
 *
 * The framework owns the rate-limit *semantics* — fixed-window accounting,
 * the 429 response shape (`Retry-After`, the IETF `RateLimit-*` fields, an
 * RFC 9457 body), key extraction, and typed guard enrichment — while
 * storage stays application-owned behind a structural two-method interface.
 * No store client is imported and none is bundled: anything that can count
 * and expire works. `createMemoryRateLimitStore()` is reference material
 * for tests and examples only (non-durable, single-process, unbounded).
 *
 * The factory composes through the ordinary guard pipeline: under the limit
 * it enriches `{ rateLimit: { limit, remaining, resetAt } }`; over the
 * limit it short-circuits with a native 429 Response. Invalid configuration
 * fails closed at guard construction (LUGAS_RATE_LIMIT_001).
 */
import { diagnostic, type DiagnosticContextValue } from "../internal/diagnostics";
import { guard } from "./guard";
import type { GuardDescriptor } from "./types";

/** A single window's accounting as observed through the store. */
export type RateLimitSnapshot = {
  readonly count: number;
  /** Epoch milliseconds when the current window expires. Store-owned. */
  readonly resetAt: number;
};

/**
 * Application-owned storage contract (structural — no import, no brand, no
 * instanceof). Implementations own expiry and durability entirely; the
 * contract computes `resetAt` values but never touches timers.
 */
export type RateLimitStore = {
  get(key: string): Promise<RateLimitSnapshot | undefined>;
  /** Record one hit; a first hit in a fresh window returns `count: 1`. */
  increment(key: string, windowMs: number): Promise<RateLimitSnapshot>;
};

/** Remaining-quota view enriched into the handler context as `rateLimit`. */
export type RateLimitInfo = {
  readonly limit: number;
  readonly remaining: number;
  /** Epoch milliseconds when the current window expires. */
  readonly resetAt: number;
};

/** Guard context passed to the optional `key` extractor. */
export type RateLimitKeyContext<TServices = unknown> = {
  readonly request: Request;
  readonly services: TServices;
  readonly [key: string]: unknown;
};

export type RateLimitConfig<TServices = unknown> = {
  /** Maximum admitted requests per window (the limit-th passes; limit+1th is 429). */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Application-owned counting store. */
  store: RateLimitStore;
  /**
   * Bucket key extractor. Default: the whole-request key (every request
   * shares one bucket per prefix) — Lugas guards see only the Request and
   * do not guess proxy headers; per-client keying is an explicit decision.
   */
  key?: (context: RateLimitKeyContext<TServices>) => string;
  /** Namespace prepended to the extracted key (separates apps sharing one store). */
  keyPrefix?: string;
  /** Replaces the default RFC 9457 body of the 429 response (sent as text/plain). */
  message?: string;
};

const RATE_LIMIT_KEYS = new Set(["limit", "windowMs", "store", "key", "keyPrefix", "message"]);

/** Problem-type URI for the default 429 body, following the RFC 9457 convention. */
export const RATE_LIMIT_PROBLEM_TYPE = "https://lugasjs.dev/problems/rate-limited";

function failInvalid(detail: string, hint: string, context?: Record<string, DiagnosticContextValue>): never {
  throw diagnostic("LUGAS_RATE_LIMIT_001", `rateLimit(): ${detail}`, { hint, context });
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/**
 * Fixed-window rate-limit guard. Under the limit the request continues with
 * `{ rateLimit: { limit, remaining, resetAt } }` enrichment; at limit+1 the
 * guard short-circuits with 429. Declared before an authenticate-style
 * guard it counts unauthenticated traffic; declared after, only
 * authenticated hits count — ordering is the application's scoping decision.
 */
export function rateLimit<TServices = unknown>(
  config: RateLimitConfig<TServices>,
): GuardDescriptor<TServices, Promise<{ rateLimit: RateLimitInfo } | Response>> {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    failInvalid("config must be an object", "pass rateLimit({ limit, windowMs, store })");
  }
  for (const key of Object.keys(config)) {
    if (!RATE_LIMIT_KEYS.has(key)) {
      failInvalid(`unknown config key '${key}'`, "allowed keys: limit, windowMs, store, key, keyPrefix, message", { key });
    }
  }
  if (!isPositiveInteger(config.limit)) {
    failInvalid("'limit' must be a positive integer", "the limit-th request in a window is the last admitted one", { limit: config.limit });
  }
  if (!isPositiveInteger(config.windowMs)) {
    failInvalid("'windowMs' must be a positive integer number of milliseconds", "fixed-window length, e.g. 60_000 for one minute", { windowMs: config.windowMs });
  }
  const store = config.store;
  if (typeof store !== "object" || store === null || Array.isArray(store)) {
    failInvalid("'store' must be an object with get()/increment()", "supply an application-owned store: { get(key), increment(key, windowMs) }");
  }
  if (typeof store.get !== "function" || typeof store.increment !== "function") {
    failInvalid("'store' must implement get(key) and increment(key, windowMs)", "structural contract — any object with those two async methods works; see createMemoryRateLimitStore() for the reference shape");
  }
  if (config.key !== undefined && typeof config.key !== "function") {
    failInvalid("'key' must be a function", "key: (ctx) => string extracts the bucket key from the guard context");
  }
  if (config.keyPrefix !== undefined && typeof config.keyPrefix !== "string") {
    failInvalid("'keyPrefix' must be a string", "prefix namespaces buckets when applications share one store");
  }
  if (config.message !== undefined && typeof config.message !== "string") {
    failInvalid("'message' must be a string", "message replaces the default RFC 9457 JSON body of the 429 response");
  }

  const { limit, windowMs, key, keyPrefix = "", message } = config;
  const storeRef = store as RateLimitStore;

  return guard<TServices, Promise<{ rateLimit: RateLimitInfo } | Response>>({
    name: "rateLimit",
    handler: async (context) => {
      const bucketKey = `${keyPrefix}${key !== undefined ? key(context) : ""}`;
      const entry = await storeRef.increment(bucketKey, windowMs);

      if (entry.count <= limit) {
        return {
          rateLimit: {
            limit,
            remaining: Math.max(0, limit - entry.count),
            resetAt: entry.resetAt,
          },
        };
      }

      const retryAfterSeconds = Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
      const headers = new Headers({
        "retry-after": String(retryAfterSeconds),
        "ratelimit-limit": String(limit),
        "ratelimit-remaining": "0",
        "ratelimit-reset": String(retryAfterSeconds),
      });
      if (message !== undefined) {
        headers.set("content-type", "text/plain; charset=utf-8");
        return new Response(message, { status: 429, headers });
      }
      headers.set("content-type", "application/problem+json");
      return new Response(
        JSON.stringify({
          type: RATE_LIMIT_PROBLEM_TYPE,
          title: "Too Many Requests",
          status: 429,
          detail: `Rate limit of ${limit} requests per window exceeded.`,
        }),
        { status: 429, headers },
      );
    },
  });
}

/**
 * Reference in-memory store for tests, examples, and single-process
 * development. NOT durable, NOT shared across workers, and unbounded —
 * production storage (Redis, Postgres, a service) is the application's
 * explicit choice per ADR-0034.
 */
export function createMemoryRateLimitStore(): RateLimitStore {
  const buckets = new Map<string, RateLimitSnapshot>();
  return {
    async get(key) {
      return buckets.get(key);
    },
    async increment(key, windowMs) {
      const now = Date.now();
      const current = buckets.get(key);
      if (current === undefined || current.resetAt <= now) {
        const fresh: RateLimitSnapshot = { count: 1, resetAt: now + windowMs };
        buckets.set(key, fresh);
        return fresh;
      }
      const advanced: RateLimitSnapshot = { count: current.count + 1, resetAt: current.resetAt };
      buckets.set(key, advanced);
      return advanced;
    },
  };
}
