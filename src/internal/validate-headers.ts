/**
 * Lower-case header projection and validation (M2-006).
 *
 * Projects native Request Headers into a lower-case dictionary only when a
 * header schema is declared. Validates against Standard Schema and maps failures
 * to 422 Problem Details with sensitive header value redaction. When no schema
 * is declared, incurs zero projection allocation.
 */
import { createValidationProblem } from "./validate-params";
import type { StandardSchema } from "./standard-schema";
import { executeStandardSchema } from "./standard-schema";
import type { NormalizedValidationIssue } from "./validation-issues";
import { normalizeValidationIssues } from "./validation-issues";

export type ValidateHeadersSuccess<T> = {
  readonly ok: true;
  readonly data: T;
};

export type ValidateHeadersFailure = {
  readonly ok: false;
  readonly response: Response;
  readonly issues: ReadonlyArray<NormalizedValidationIssue>;
};

export type ValidateHeadersResult<T> = ValidateHeadersSuccess<T> | ValidateHeadersFailure;

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
  "x-api-key",
  "apikey",
  "x-auth-token",
]);

/**
 * Projects Headers or Request into a lower-case null-prototype dictionary.
 */
export function projectHeaders(input: Headers | Request): Record<string, string> {
  const headers = input instanceof Request ? input.headers : input;
  const result: Record<string, string> = Object.create(null);

  for (const [key, value] of headers.entries()) {
    result[key.toLowerCase()] = value;
  }

  return result;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return false;
  return typeof (value as { readonly then?: unknown }).then === "function";
}

function sanitizeHeaderIssues(
  issues: ReadonlyArray<NormalizedValidationIssue>,
): ReadonlyArray<NormalizedValidationIssue> {
  return issues.map((issue) => {
    const firstSegment = issue.path?.[0];
    const isSensitive =
      typeof firstSegment === "string" && SENSITIVE_HEADER_KEYS.has(firstSegment.toLowerCase());

    if (!isSensitive) return issue;

    return {
      ...issue,
      message: "Invalid sensitive header format",
    };
  });
}

function handleValidationResult<TOutput>(
  rawResult: { readonly value?: unknown; readonly issues?: unknown },
): ValidateHeadersResult<TOutput> {
  if (rawResult.issues !== undefined) {
    const normalized = normalizeValidationIssues(rawResult.issues);
    const sanitized = sanitizeHeaderIssues(normalized);
    return {
      ok: false,
      response: createValidationProblem(sanitized),
      issues: sanitized,
    };
  }
  return {
    ok: true,
    data: rawResult.value as TOutput,
  };
}

export function validateHeaders<
  TSchema extends StandardSchema<any, any> | undefined,
>(
  schema: TSchema,
  headers: Headers | Request,
): TSchema extends StandardSchema<any, infer Output>
  ? ValidateHeadersResult<Output> | Promise<ValidateHeadersResult<Output>>
  : ValidateHeadersSuccess<undefined> {
  if (schema === undefined) {
    return {
      ok: true,
      data: undefined,
    } as any;
  }

  const projected = projectHeaders(headers);
  const result = executeStandardSchema(schema, projected);
  if (isPromiseLike(result)) {
    return Promise.resolve(result).then(handleValidationResult) as any;
  }
  return handleValidationResult(result) as any;
}
