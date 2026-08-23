/**
 * `guard()` descriptor factory (M1-005).
 *
 * Guards are named, ordered, and explicit (ADR-0011). The name must be a
 * non-empty string: it is the stable identity used by manifests and
 * diagnostics. The handler may enrich context (plain object), short-circuit
 * (Response), or return a promise of either — but never `undefined` or a
 * primitive, which the handler return type rejects at compile time and the
 * executor rejects at runtime (M2-010).
 */
import { diagnostic } from "../internal/diagnostics";
import { brand } from "../internal/brands";
import type { GuardDescriptor, GuardHandler } from "./types";

export type GuardConfig<TServices, TResult extends object> = {
  name: string;
  handler: (context: {
    readonly request: Request;
    readonly services: TServices;
    readonly [key: string]: unknown;
  }) => TResult;
};

const GUARD_KEYS = new Set(["name", "handler"]);

export function guard<TServices, TResult extends object>(
  config: GuardConfig<TServices, TResult>,
): GuardDescriptor<TServices, TResult> {
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_GUARD_001", "guard(): config must be an object", { hint: "pass guard({ name, handler })" });
  }
  for (const key of Object.keys(config)) {
    if (!GUARD_KEYS.has(key)) {
      throw diagnostic("LUGAS_GUARD_002", `guard(): unknown config key '${key}'`, { hint: "allowed keys: name, handler", context: { key } });
    }
  }
  if (typeof config.name !== "string" || config.name.trim() === "") {
    throw diagnostic("LUGAS_GUARD_003", "guard(): 'name' must be a non-empty string", { hint: "guard names appear in manifests; use stable names" });
  }
  if (typeof config.handler !== "function") {
    throw diagnostic("LUGAS_GUARD_004", "guard(): 'handler' must be a function", { hint: "return a Response to short-circuit or an enrichment object" });
  }
  return brand(Object.freeze({ name: config.name, handler: config.handler }), "GuardDescriptor");
}
