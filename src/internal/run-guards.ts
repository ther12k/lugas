/**
 * Ordered guard execution and short-circuit handling (M2-010, M2-011).
 *
 * Runs named route guards in sequence. If a guard returns a native Response,
 * execution stops immediately (short-circuit), bypassing later guards and the
 * route handler. Synchronous execution is preserved when all guards in the chain
 * return synchronously. Rejects overwriting reserved context keys.
 */
import type { GuardDescriptor } from "../core/types";
import { BASE_CONTEXT_RESERVED_KEYS } from "./context";

export type RunGuardsResult =
  | { readonly kind: "continue"; readonly context: Record<string, unknown> }
  | { readonly kind: "response"; readonly response: Response };

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return false;
  return typeof (value as { readonly then?: unknown }).then === "function";
}

function applyEnrichment(
  guardName: string,
  target: Record<string, unknown>,
  enrichment: unknown,
): Record<string, unknown> {
  if (typeof enrichment !== "object" || enrichment === null) return target;
  for (const key of Object.keys(enrichment)) {
    if (BASE_CONTEXT_RESERVED_KEYS.has(key)) {
      throw new Error(`Guard '${guardName}' cannot overwrite reserved context key '${key}'`);
    }
  }
  return { ...target, ...enrichment };
}

export function runGuards(
  guards: ReadonlyArray<GuardDescriptor<any, any>>,
  baseContext: { readonly request: Request; readonly services: unknown },
): RunGuardsResult | Promise<RunGuardsResult> {
  if (guards.length === 0) {
    return { kind: "continue", context: {} };
  }

  let enrichedContext: Record<string, unknown> = {};

  for (let i = 0; i < guards.length; i++) {
    const guard = guards[i]!;
    const currentInput = { ...baseContext, ...enrichedContext };
    const result = guard.handler(currentInput);

    if (isPromiseLike(result)) {
      return (async () => {
        let asyncResult = await result;
        if (asyncResult instanceof Response) {
          return { kind: "response", response: asyncResult };
        }
        enrichedContext = applyEnrichment(guard.name, enrichedContext, asyncResult);

        for (let j = i + 1; j < guards.length; j++) {
          const nextGuard = guards[j]!;
          const nextInput = { ...baseContext, ...enrichedContext };
          const nextResult = await nextGuard.handler(nextInput);
          if (nextResult instanceof Response) {
            return { kind: "response", response: nextResult };
          }
          enrichedContext = applyEnrichment(nextGuard.name, enrichedContext, nextResult);
        }
        return { kind: "continue", context: enrichedContext };
      })();
    }

    if (result instanceof Response) {
      return { kind: "response", response: result };
    }

    enrichedContext = applyEnrichment(guard.name, enrichedContext, result);
  }

  return { kind: "continue", context: enrichedContext };
}
