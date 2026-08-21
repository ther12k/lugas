/**
 * Query parameter validation and inferred output handling (M2-005).
 *
 * Decodes URL search parameters and validates against a declared Standard Schema.
 * Returns transformed output to handlers and guards. When no query schema is
 * declared, skips query decoding and validation completely.
 */
import { createValidationProblem } from "./validate-params";
import type { DecodedQuery } from "./decode-query";
import { decodeQuery } from "./decode-query";
import type { StandardSchema } from "./standard-schema";
import { executeStandardSchema } from "./standard-schema";
import type { NormalizedValidationIssue } from "./validation-issues";
import { normalizeValidationIssues } from "./validation-issues";

export type ValidateQuerySuccess<T> = {
  readonly ok: true;
  readonly data: T;
};

export type ValidateQueryFailure = {
  readonly ok: false;
  readonly response: Response;
  readonly issues: ReadonlyArray<NormalizedValidationIssue>;
};

export type ValidateQueryResult<T> = ValidateQuerySuccess<T> | ValidateQueryFailure;

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return false;
  return typeof (value as { readonly then?: unknown }).then === "function";
}

function handleValidationResult<TOutput>(
  rawResult: { readonly value?: unknown; readonly issues?: unknown },
): ValidateQueryResult<TOutput> {
  if (rawResult.issues !== undefined) {
    const normalized = normalizeValidationIssues(rawResult.issues);
    return {
      ok: false,
      response: createValidationProblem(normalized),
      issues: normalized,
    };
  }
  return {
    ok: true,
    data: rawResult.value as TOutput,
  };
}

export function validateQuery<
  TSchema extends StandardSchema<any, any> | undefined,
>(
  schema: TSchema,
  input: string | URL | URLSearchParams | Request,
): TSchema extends StandardSchema<any, infer Output>
  ? ValidateQueryResult<Output> | Promise<ValidateQueryResult<Output>>
  : ValidateQuerySuccess<undefined> {
  if (schema === undefined) {
    return {
      ok: true,
      data: undefined,
    } as any;
  }

  const decoded: DecodedQuery = decodeQuery(input);
  const result = executeStandardSchema(schema, decoded);
  if (isPromiseLike(result)) {
    return Promise.resolve(result).then(handleValidationResult) as any;
  }
  return handleValidationResult(result) as any;
}
