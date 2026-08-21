import type { ValidateQueryResult } from "../../src/internal/validate-query";
import { validateQuery } from "../../src/internal/validate-query";
import type { StandardSchema } from "../../src/internal/standard-schema";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Without schema, query result data is undefined
const noSchemaResult = validateQuery(undefined, "https://example.com/test");
type NoSchemaData = (typeof noSchemaResult)["data"];
type _t1 = Expect<Equal<NoSchemaData, undefined>>;

// 2. With schema, query data is the transformed Output type
declare const querySchema: StandardSchema<unknown, { search: string; limit: number }>;
const schemaResult = validateQuery(querySchema, "https://example.com/test");
type SchemaData = typeof schemaResult extends ValidateQueryResult<infer D> | Promise<ValidateQueryResult<infer D>> ? D : never;
type _t2 = Expect<Equal<SchemaData, { search: string; limit: number }>>;
