import type { ValidateParamsResult } from "../../src/internal/validate-params";
import { validateParams } from "../../src/internal/validate-params";
import type { StandardSchema } from "../../src/internal/standard-schema";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Without schema, params type is Record<string, string>
const noSchemaResult = validateParams(undefined, { id: "123" });
type NoSchemaData = (typeof noSchemaResult)["data"];
type _t1 = Expect<Equal<NoSchemaData, Record<string, string>>>;

// 2. With schema, params data is the transformed Output type
declare const numberIdSchema: StandardSchema<unknown, { id: number; slug: string }>;
const schemaResult = validateParams(numberIdSchema, { id: "123" });
type SchemaData = typeof schemaResult extends ValidateParamsResult<infer D> | Promise<ValidateParamsResult<infer D>> ? D : never;
type _t2 = Expect<Equal<SchemaData, { id: number; slug: string }>>;
