/**
 * Unified Request Validation Problem Details Mapping (M2-009).
 *
 * Produces stable, RFC 9457-compliant Problem Details responses for:
 * - 422 Unprocessable Entity (VALIDATION_FAILED) for schema errors across params, query, headers, and body
 * - 415 Unsupported Media Type (UNSUPPORTED_MEDIA_TYPE) for non-JSON body Content-Type
 * - 400 Bad Request (MALFORMED_JSON) for body JSON syntax errors
 *
 * Excludes raw body fragments, execution stacks, and internal library objects.
 */
import { problem } from "../core/response";
import type { NormalizedValidationIssue } from "./validation-issues";

export type ValidationSource = "params" | "query" | "headers" | "body";

export const VALIDATION_PROBLEM_URI = "https://lugasjs.dev/problems/validation";
export const UNSUPPORTED_MEDIA_TYPE_URI = "https://lugasjs.dev/problems/unsupported-media-type";
export const MALFORMED_JSON_URI = "https://lugasjs.dev/problems/malformed-json";

export type ValidationProblemFields = {
  type: string;
  title: string;
  status: number;
  code: "VALIDATION_FAILED" | "UNSUPPORTED_MEDIA_TYPE" | "MALFORMED_JSON";
  detail?: string | undefined;
  source?: ValidationSource | undefined;
  issues?: ReadonlyArray<NormalizedValidationIssue> | undefined;
};

export function createValidationProblem(
  issues: ReadonlyArray<NormalizedValidationIssue>,
  source?: ValidationSource,
): Response {
  const fields: ValidationProblemFields = {
    type: VALIDATION_PROBLEM_URI,
    title: "Request validation failed",
    status: 422,
    code: "VALIDATION_FAILED",
    issues,
  };
  if (source !== undefined) {
    fields.source = source;
  }
  return problem(422, fields);
}

export function createUnsupportedMediaTypeProblem(
  detail: string = "Expected a JSON-compatible Content-Type header (e.g. application/json)",
): Response {
  return problem(415, {
    type: UNSUPPORTED_MEDIA_TYPE_URI,
    title: "Unsupported Media Type",
    status: 415,
    code: "UNSUPPORTED_MEDIA_TYPE",
    source: "body",
    detail,
  });
}

export function createMalformedJsonProblem(
  detail: string = "Request body could not be parsed as valid JSON",
): Response {
  return problem(400, {
    type: MALFORMED_JSON_URI,
    title: "Malformed JSON",
    status: 400,
    code: "MALFORMED_JSON",
    source: "body",
    detail,
  });
}
