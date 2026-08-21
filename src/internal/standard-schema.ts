/** Structural Standard Schema v1 detection and execution (M2-001). */

export interface StandardSchemaPathSegment {
  readonly key: PropertyKey;
}

export interface StandardSchemaIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | StandardSchemaPathSegment> | undefined;
}

export interface StandardSchemaSuccess<Output> {
  readonly value: Output;
  readonly issues?: undefined;
}

export interface StandardSchemaFailure {
  readonly issues: ReadonlyArray<StandardSchemaIssue>;
  readonly value?: undefined;
}

export type StandardSchemaResult<Output> =
  | StandardSchemaSuccess<Output>
  | StandardSchemaFailure;

export interface StandardSchema<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
    readonly types?: {
      readonly input: Input;
      readonly output: Output;
    } | undefined;
  };
}

export type StandardSchemaInput<Schema extends { readonly "~standard": unknown }> =
  Schema extends { readonly "~standard": { readonly types?: { readonly input: infer Input } | undefined } }
    ? Input
    : unknown;

export type StandardSchemaOutput<Schema extends { readonly "~standard": unknown }> =
  Schema extends { readonly "~standard": { readonly types?: { readonly output: infer Output } | undefined } }
    ? Output
    : unknown;

export type StandardSchemaErrorCode = "STANDARD_SCHEMA_INVALID" | "STANDARD_SCHEMA_RESULT_INVALID";

export class StandardSchemaError extends TypeError {
  readonly code: StandardSchemaErrorCode;

  constructor(code: StandardSchemaErrorCode, message: string) {
    super(message);
    this.name = "StandardSchemaError";
    this.code = code;
  }
}

function invalidSchema(message: string): StandardSchemaError {
  return new StandardSchemaError("STANDARD_SCHEMA_INVALID", message);
}

function invalidResult(message: string): StandardSchemaError {
  return new StandardSchemaError("STANDARD_SCHEMA_RESULT_INVALID", message);
}

function readStandard(value: unknown): StandardSchema["~standard"] | undefined {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return undefined;
  try {
    const standard = (value as { readonly "~standard"?: unknown })["~standard"];
    if (typeof standard !== "object" || standard === null) return undefined;
    return standard as StandardSchema["~standard"];
  } catch {
    return undefined;
  }
}

export function isStandardSchema(value: unknown): value is StandardSchema {
  const standard = readStandard(value);
  if (standard === undefined) return false;
  try {
    return standard.version === 1 && typeof standard.vendor === "string" && typeof standard.validate === "function";
  } catch {
    return false;
  }
}

export function assertStandardSchema<Input, Output>(
  value: unknown,
): asserts value is StandardSchema<Input, Output> {
  const standard = readStandard(value);
  if (standard === undefined) {
    throw invalidSchema("schema must expose a '~standard' object");
  }
  let version: unknown;
  let vendor: unknown;
  let validate: unknown;
  try {
    version = standard.version;
    vendor = standard.vendor;
    validate = standard.validate;
  } catch {
    throw invalidSchema("schema '~standard' metadata could not be read");
  }
  if (version !== 1) throw invalidSchema("schema '~standard.version' must be 1");
  if (typeof vendor !== "string") throw invalidSchema("schema '~standard.vendor' must be a string");
  if (typeof validate !== "function") throw invalidSchema("schema '~standard.validate' must be a function");
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return false;
  return typeof (value as { readonly then?: unknown }).then === "function";
}

function isIssue(value: unknown): value is StandardSchemaIssue {
  return typeof value === "object" && value !== null && typeof (value as { readonly message?: unknown }).message === "string";
}

function normalizeResult<Output>(value: unknown): StandardSchemaResult<Output> {
  if (typeof value !== "object" || value === null) {
    throw invalidResult("validator result must be an object");
  }
  const result = value as { readonly value?: unknown; readonly issues?: unknown };
  if (result.issues !== undefined) {
    if (!Array.isArray(result.issues) || !result.issues.every(isIssue)) {
      throw invalidResult("validator result 'issues' must be an array of issue objects");
    }
    return { issues: result.issues };
  }
  if (!("value" in result)) throw invalidResult("successful validator result must contain 'value'");
  return { value: result.value as Output };
}

export function executeStandardSchema<Input, Output>(
  schema: StandardSchema<Input, Output>,
  value: Input,
): StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>> {
  assertStandardSchema<Input, Output>(schema);
  const result = schema["~standard"].validate(value);
  if (isPromiseLike(result)) return Promise.resolve(result).then(normalizeResult<Output>);
  return normalizeResult<Output>(result);
}
