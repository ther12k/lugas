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
import { brand } from "../internal/brands";
import type { GuardDescriptor, GuardHandler } from "./types";

export type GuardConfig<TServices, Enrichment extends object> = {
  name: string;
  handler: GuardHandler<TServices, Enrichment>;
};

const GUARD_KEYS = new Set(["name", "handler"]);

export function guard<TServices, Enrichment extends object>(
  config: GuardConfig<TServices, Enrichment>,
): GuardDescriptor<TServices, Enrichment> {
  if (typeof config !== "object" || config === null) {
    throw new Error("guard(): config must be an object");
  }
  for (const key of Object.keys(config)) {
    if (!GUARD_KEYS.has(key)) {
      throw new Error(`guard(): unknown config key '${key}' (allowed: name, handler)`);
    }
  }
  if (typeof config.name !== "string" || config.name.trim() === "") {
    throw new Error("guard(): 'name' must be a non-empty string");
  }
  if (typeof config.handler !== "function") {
    throw new Error("guard(): 'handler' must be a function");
  }
  return brand(Object.freeze({ name: config.name, handler: config.handler }), "GuardDescriptor");
}
