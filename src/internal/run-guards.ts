/**
 * Ordered guard execution and short-circuit handling (M2-010, M2-011, M4R1-003).
 *
 * Runs named route guards in sequence. Guards receive the full validated
 * request context (request, services, params/query/headers/body when declared)
 * plus all previous guards' enrichments. A native Response short-circuits
 * immediately. Valid enrichment results are plain objects only; framework-owned
 * keys can never be overwritten and duplicate keys across guards fail closed.
 * Synchronous execution is preserved when every stage is synchronous.
 */
import type { GuardDescriptor } from "../core/types";
import { BASE_CONTEXT_RESERVED_KEYS } from "./context";
import { diagnostic } from "./diagnostics";

export type RunGuardsResult =
  | { readonly kind: "continue"; readonly context: Record<string, unknown> }
  | { readonly kind: "response"; readonly response: Response };

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return false;
  return typeof (value as { readonly then?: unknown }).then === "function";
}

/**
 * Runtime guard result contract: native Response (short-circuit) or a plain
 * object (enrichment), synchronously or via Promise. Everything else —
 * undefined, null, arrays, Date/class instances, primitives — fails closed.
 */
function assertValidGuardResult(guardName: string, result: unknown): void {
  if (result instanceof Response) return;
  if (
    typeof result === "object" &&
    result !== null &&
    !Array.isArray(result) &&
    (Object.getPrototypeOf(result) === Object.prototype || Object.getPrototypeOf(result) === null)
  ) {
    return;
  }
  throw diagnostic("LUGAS_GUARD_005", `Guard '${guardName}' must return a native Response or a plain object`, {
    hint: "return Response to short-circuit, {} for no enrichment, or a plain object of context fields",
    context: { guard: guardName },
  });
}

function applyEnrichment(
  guardName: string,
  target: Record<string, unknown>,
  keyOwners: Map<string, string>,
  enrichment: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...target };
  for (const key of Object.keys(enrichment)) {
    if (BASE_CONTEXT_RESERVED_KEYS.has(key)) {
      throw diagnostic(
        "LUGAS_GUARD_006",
        `Guard '${guardName}' cannot overwrite reserved context key '${key}'`,
        { hint: "guards may add new context keys but never framework-owned ones", context: { guard: guardName, key } },
      );
    }
    const prior = keyOwners.get(key);
    if (prior !== undefined) {
      throw diagnostic(
        "LUGAS_GUARD_007",
        `duplicate guard enrichment key '${key}': produced by '${prior}' and '${guardName}'`,
        { hint: "each enrichment key may be produced by exactly one guard per route", context: { key, guards: `${prior}, ${guardName}` } },
      );
    }
    next[key] = enrichment[key];
    keyOwners.set(key, guardName);
  }
  return next;
}

export function runGuards(
  guards: ReadonlyArray<GuardDescriptor<any, any>>,
  baseContext: Readonly<Record<string, unknown>>,
): RunGuardsResult | Promise<RunGuardsResult> {
  if (guards.length === 0) {
    return { kind: "continue", context: {} };
  }

  let enrichedContext: Record<string, unknown> = {};
  const keyOwners = new Map<string, string>();

  const consume = (guardName: string, result: unknown): { shortCircuit?: Response } => {
    if (result instanceof Response) return { shortCircuit: result };
    assertValidGuardResult(guardName, result);
    enrichedContext = applyEnrichment(guardName, enrichedContext, keyOwners, result as Record<string, unknown>);
    return {};
  };

  // Guard handlers are user functions whose declared input type predates the
  // validated-slot contract; type-level inference is owned by M4R1-005 (#199).
  const invoke = (handler: (input: never) => unknown, input: Record<string, unknown>): unknown =>
    (handler as (i: Record<string, unknown>) => unknown)(input);

  for (let i = 0; i < guards.length; i++) {
    const guard = guards[i]!;
    const currentInput = { ...baseContext, ...enrichedContext };
    const raw = invoke(guard.handler, currentInput);

    if (isPromiseLike(raw)) {
      return (async () => {
        let first = await raw;
        let out = consume(guard.name, first);
        if (out.shortCircuit) return { kind: "response", response: out.shortCircuit };

        for (let j = i + 1; j < guards.length; j++) {
          const nextGuard = guards[j]!;
          const nextInput = { ...baseContext, ...enrichedContext };
          const nextRaw = await invoke(nextGuard.handler, nextInput);
          out = consume(nextGuard.name, nextRaw);
          if (out.shortCircuit) return { kind: "response", response: out.shortCircuit };
        }
        return { kind: "continue", context: enrichedContext };
      })();
    }

    const out = consume(guard.name, raw);
    if (out.shortCircuit) return { kind: "response", response: out.shortCircuit };
  }

  return { kind: "continue", context: enrichedContext };
}
