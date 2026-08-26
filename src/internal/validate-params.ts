/**
 * Path parameter validation and transformed output handling (M2-003).
 *
 * Validates native Bun path params when a schema is declared and returns
 * transformed output to handlers and guards. When no schema is declared,
 * passes raw string params through with zero validation overhead.
 */
import type { StandardSchema, StandardSchemaOutput } from "./standard-schema";
import { executeStandardSchema } from "./standard-schema";
import type { NormalizedValidationIssue } from "./validation-issues";
import { normalizeValidationIssues } from "./validation-issues";
import { createValidationProblem } from "./validation-problem";

// Re-exported for existing importers (validate-query/body/headers); the
// canonical factory lives in validation-problem.ts (M6R1-009).
export { createValidationProblem };
export { VALIDATION_PROBLEM_URI as VALIDATION_PROBLEM_TYPE } from "./validation-problem";

export type ValidateParamsSuccess<T> = {
  readonly ok: true;
  readonly data: T;
};

export type ValidateParamsFailure = {
  readonly ok: false;
  readonly response: Response;
  readonly issues: ReadonlyArray<NormalizedValidationIssue>;
};

export type ValidateParamsResult<T> = ValidateParamsSuccess<T> | ValidateParamsFailure;

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return false;
  return typeof (value as { readonly then?: unknown }).then === "function";
}

function handleValidationResult<TOutput>(
  rawResult: { readonly value?: unknown; readonly issues?: unknown },
): ValidateParamsResult<TOutput> {
  if (rawResult.issues !== undefined) {
    const normalized = normalizeValidationIssues(rawResult.issues);
    return {
      ok: false,
      response: createValidationProblem(normalized, "params"),
      issues: normalized,
    };
  }
  return {
    ok: true,
    data: rawResult.value as TOutput,
  };
}

export function validateParams<
  TSchema extends StandardSchema<any, any> | undefined,
>(
  schema: TSchema,
  rawParams: Record<string, string>,
): TSchema extends StandardSchema<any, infer Output>
  ? ValidateParamsResult<Output> | Promise<ValidateParamsResult<Output>>
  : ValidateParamsSuccess<Record<string, string>> {
  if (schema === undefined) {
    return {
      ok: true,
      data: rawParams,
    } as any;
  }

  const result = executeStandardSchema(schema, rawParams);
  if (isPromiseLike(result)) {
    return Promise.resolve(result).then(handleValidationResult) as any;
  }
  return handleValidationResult(result) as any;
}
