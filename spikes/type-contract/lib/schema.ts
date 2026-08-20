/**
 * Minimal Standard-Schema-shaped interface for the M0-009 spike.
 *
 * Mirrors the structural subset of @standard-schema/spec that Lugas needs:
 * validators carry phantom `~types` describing input/output, and a `validate`
 * function usable at runtime. Input != output proves schema transformation
 * (e.g. query strings parsed to numbers).
 */

export type StandardSchemaResult<Output> =
  | { readonly ok: true; readonly value: Output }
  | { readonly ok: false; readonly issues: readonly string[] };

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~types"?: {
    readonly input: Input;
    readonly output: Output;
  };
  readonly validate: (value: unknown) => StandardSchemaResult<Output>;
}

/** Phantom marker for "no schema declared for this slot". */
export declare const absent: unique symbol;
export type Absent = typeof absent;

/** Extract the validated/transformed output of a schema slot (Absent when undeclared). */
export type SchemaOutput<T> = [T] extends [StandardSchemaV1<infer _Input, infer Output>]
  ? Output
  : Absent;

/** Extract the pre-validation input of a schema slot (Absent when undeclared). */
export type SchemaInput<T> = [T] extends [StandardSchemaV1<infer Input, infer _Output>]
  ? Input
  : Absent;

/**
 * Input schemas accepted by a route descriptor. All slots optional; presence
 * of a schema makes the validated value appear on the handler context and in
 * the route contract.
 */
export interface InputSchemas {
  params?: StandardSchemaV1;
  query?: StandardSchemaV1;
  headers?: StandardSchemaV1;
  body?: StandardSchemaV1;
}

/** Resolved schema outputs for all four slots (Absent means "not declared"). */
export type SchemaOutputs<S extends InputSchemas> = {
  params: SchemaOutput<S["params"]>;
  query: SchemaOutput<S["query"]>;
  headers: SchemaOutput<S["headers"]>;
  body: SchemaOutput<S["body"]>;
};

/**
 * Tiny deterministic validator kit used by the spike's runtime-equivalent
 * tests. It is intentionally trivial: the spike is about types, not validation.
 */
export const s = {
  string(): StandardSchemaV1<string, string> {
    return {
      validate: (value) =>
        typeof value === "string"
          ? { ok: true, value }
          : { ok: false, issues: ["expected string"] },
    };
  },
  /** Transforming validator: accepts string, outputs number. */
  int(): StandardSchemaV1<string, number> {
    return {
      validate: (value) => {
        const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
        return Number.isFinite(parsed)
          ? { ok: true, value: parsed }
          : { ok: false, issues: ["expected integer string"] };
      },
    };
  },
  /** Transforming validator: lowercases and trims. */
  email(): StandardSchemaV1<string, string> {
    return {
      validate: (value) =>
        typeof value === "string"
          ? { ok: true, value: value.trim().toLowerCase() }
          : { ok: false, issues: ["expected email string"] },
    };
  },
  object<Shape extends Record<string, StandardSchemaV1>>(
    shape: Shape,
  ): StandardSchemaV1<
    { [K in keyof Shape]: SchemaInputOf<Shape[K]> },
    { [K in keyof Shape]: SchemaOutputOf<Shape[K]> }
  > {
    return {
      validate: (value) => {
        if (typeof value !== "object" || value === null) {
          return { ok: false, issues: ["expected object"] };
        }
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(shape)) {
          const result = shape[key]!.validate((value as Record<string, unknown>)[key]);
          if (!result.ok) return { ok: false, issues: [`${key}: ${result.issues.join(", ")}`] };
          out[key] = result.value;
        }
        return { ok: true, value: out as { [K in keyof Shape]: SchemaOutputOf<Shape[K]> } };
      },
    };
  },
};

type SchemaInputOf<S> = S extends StandardSchemaV1<infer Input, infer _Output> ? Input : never;
type SchemaOutputOf<S> = S extends StandardSchemaV1<infer _Input, infer Output> ? Output : never;
