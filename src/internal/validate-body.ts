/**
 * JSON body validation and transformed output handling (M2-008).
 *
 * Reads declared JSON bodies once through the media-type parser (M2-007) and
 * feeds the parsed payload to Standard Schema. Exposes transformed body output
 * to guards and handlers while returning 415/400/422 Problem Details on failure.
 * When no body schema is declared, skips body reading entirely.
 */
import { createValidationProblem } from "./validate-params";
import { parseJsonBody } from "./parse-json-body";
import type { StandardSchema } from "./standard-schema";
import { executeStandardSchema } from "./standard-schema";
import type { NormalizedValidationIssue } from "./validation-issues";
import { normalizeValidationIssues } from "./validation-issues";

export type ValidateBodySuccess<T> = {
  readonly ok: true;
  readonly data: T;
};

export type ValidateBodyFailure = {
  readonly ok: false;
  readonly response: Response;
  readonly issues?: ReadonlyArray<NormalizedValidationIssue> | undefined;
};

export type ValidateBodyResult<T> = ValidateBodySuccess<T> | ValidateBodyFailure;

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return false;
  return typeof (value as { readonly then?: unknown }).then === "function";
}

function handleValidationResult<TOutput>(
  rawResult: { readonly value?: unknown; readonly issues?: unknown },
): ValidateBodyResult<TOutput> {
  if (rawResult.issues !== undefined) {
    const normalized = normalizeValidationIssues(rawResult.issues);
    return {
      ok: false,
      response: createValidationProblem(normalized, "body"),
      issues: normalized,
    };
  }
  return {
    ok: true,
    data: rawResult.value as TOutput,
  };
}

export async function validateBody<
  TSchema extends StandardSchema<any, any> | undefined,
>(
  schema: TSchema,
  request: Request,
): Promise<
  TSchema extends StandardSchema<any, infer Output>
    ? ValidateBodyResult<Output>
    : ValidateBodySuccess<undefined>
> {
  if (schema === undefined) {
    return {
      ok: true,
      data: undefined,
    } as any;
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    return {
      ok: false,
      response: parsed.response,
    } as any;
  }

  const result = executeStandardSchema(schema, parsed.data);
  if (isPromiseLike(result)) {
    const resolved = await result;
    return handleValidationResult(resolved) as any;
  }
  return handleValidationResult(result) as any;
}
