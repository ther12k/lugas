import type { ValidateBodyResult } from "../../src/internal/validate-body";
import { validateBody } from "../../src/internal/validate-body";
import type { StandardSchema } from "../../src/internal/standard-schema";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Without schema, body result data is undefined
const noSchemaPromise = validateBody(undefined, new Request("http://x/"));
type NoSchemaResolved = Awaited<typeof noSchemaPromise>;
type NoSchemaData = NoSchemaResolved["data"];
type _t1 = Expect<Equal<NoSchemaData, undefined>>;

// 2. With schema, body data is the transformed Output type
declare const bodySchema: StandardSchema<{ id: string; count: string }, { id: string; count: number }>;
const schemaPromise = validateBody(bodySchema, new Request("http://x/"));
type SchemaResolved = Awaited<typeof schemaPromise>;
type SchemaData = SchemaResolved extends ValidateBodyResult<infer D> ? D : never;
type _t2 = Expect<Equal<SchemaData, { id: string; count: number }>>;
