/**
 * Production-hardening configuration (M9-004, ADR-0029): secure-headers
 * policy compilation and health-endpoint config validation.
 *
 * secureHeaders is a conservative, fill-if-absent policy: three baseline
 * headers when enabled, CSP and HSTS strictly opt-in strings/numbers. The
 * framework never invents a Content-Security-Policy (owner constraint).
 *
 * health mounts GET liveness/readiness endpoints that bypass the ADR-0020
 * traffic gate — that boundary IS the liveness/readiness distinction:
 * liveness answers 200 while booting (a booting pod is alive), readiness
 * awaits the gate (503 while held or after startup failure).
 */
import { diagnostic } from "./diagnostics";

export type SecureHeadersConfig =
  | true
  | {
      /** Explicit CSP string; never defaulted, never templated. */
      readonly contentSecurityPolicy?: string;
      /** Emits `Strict-Transport-Security: max-age=<n>`; opt-in (https deployments). */
      readonly hstsMaxAge?: number;
    };

export type CompiledSecureHeaders = {
  readonly headers: ReadonlyArray<readonly [string, string]>;
};

const DEFAULT_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "deny"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
];

export function compileSecureHeaders(config: SecureHeadersConfig): CompiledSecureHeaders {
  if (config === true) return { headers: DEFAULT_HEADERS };
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_HEADERS_001", "defineApp(): invalid secureHeaders configuration", {
      hint: "pass secureHeaders: true or { contentSecurityPolicy?: string, hstsMaxAge?: number }",
    });
  }
  const extra: Array<readonly [string, string]> = [];
  if (config.contentSecurityPolicy !== undefined) {
    if (typeof config.contentSecurityPolicy !== "string" || config.contentSecurityPolicy.trim() === "") {
      throw diagnostic("LUGAS_HEADERS_001", "defineApp(): secureHeaders.contentSecurityPolicy must be a non-empty string", {
        hint: "CSP is strictly opt-in — pass the exact policy string; Lugas never generates one",
        context: { key: "contentSecurityPolicy" },
      });
    }
    extra.push(["content-security-policy", config.contentSecurityPolicy]);
  }
  if (config.hstsMaxAge !== undefined) {
    if (typeof config.hstsMaxAge !== "number" || !Number.isInteger(config.hstsMaxAge) || config.hstsMaxAge <= 0) {
      throw diagnostic("LUGAS_HEADERS_001", "defineApp(): secureHeaders.hstsMaxAge must be a positive integer number of seconds", {
        hint: "Strict-Transport-Security is opt-in for https deployments",
        context: { key: "hstsMaxAge" },
      });
    }
    extra.push(["strict-transport-security", `max-age=${config.hstsMaxAge}`]);
  }
  return { headers: [...DEFAULT_HEADERS, ...extra] };
}

/**
 * Applies the compiled policy to a response without overwriting headers the
 * handler set (fill-if-absent, ADR-0029): the policy hardens negligence
 * rather than fighting intent.
 */
export function applySecureHeaders(compiled: CompiledSecureHeaders, response: Response): Response {
  const existing = new Headers(response.headers);
  const missing = compiled.headers.filter(([name]) => !existing.has(name));
  if (missing.length === 0) return response;
  for (const [name, value] of missing) existing.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: existing,
  });
}

export type HealthConfig =
  | true
  | {
      /** Liveness endpoint path; default "/health". */
      readonly livenessPath?: string;
      /** Readiness endpoint path; default "/ready". */
      readonly readinessPath?: string;
    };

export type CompiledHealth = {
  readonly livenessPath: string;
  readonly readinessPath: string;
};

function validHealthPath(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && path.length > 1 && !path.includes("*");
}

export function compileHealthConfig(config: HealthConfig): CompiledHealth {
  if (config === true) return { livenessPath: "/health", readinessPath: "/ready" };
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_HEALTH_001", "defineApp(): invalid health configuration", {
      hint: "pass health: true or { livenessPath?: string, readinessPath?: string }",
    });
  }
  const livenessPath = config.livenessPath ?? "/health";
  const readinessPath = config.readinessPath ?? "/ready";
  if (!validHealthPath(livenessPath) || !validHealthPath(readinessPath)) {
    throw diagnostic("LUGAS_HEALTH_001", "defineApp(): health paths must be concrete paths starting with '/'", {
      hint: "health endpoints are exact paths (no wildcards); defaults are /health and /ready",
      context: { key: validHealthPath(livenessPath) ? "readinessPath" : "livenessPath" },
    });
  }
  if (livenessPath === readinessPath) {
    throw diagnostic("LUGAS_HEALTH_001", "defineApp(): health liveness and readiness paths must differ", {
      hint: "liveness and readiness have distinct semantics; give each its own path",
    });
  }
  return { livenessPath, readinessPath };
}
