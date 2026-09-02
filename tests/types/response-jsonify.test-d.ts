/**
 * JSON serialization-honest response typing (M6R7).
 *
 * `json()` serializes with `JSON.stringify`, so the response brand carries
 * `Jsonify<B>` — the shape that actually reaches the wire — not the raw
 * in-memory body type. Runtime serialization is untouched; these are
 * compile-time facts only.
 */
import type { Jsonify, TypedResponse } from "../../src/core/response";
import { json } from "../../src/core/response";
import type { AppContract } from "../../src/core/contract";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import type { ClientOutcomes } from "../../src/client/types";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

class Reported {
  constructor(readonly id: string) {}
  toJSON() {
    return { id: this.id, ts: "2026-01-01T00:00:00.000Z" };
  }
}

// 1. JSON-safe bodies round-trip unchanged (shape, tuples, readonly arrays).
type _t1 = Expect<
  Equal<Jsonify<{ a: string; b: number; c: boolean; d: null }>, { a: string; b: number; c: boolean; d: null }>
>;
type _t2 = Expect<Equal<Jsonify<string[]>, string[]>>;
type _t3 = Expect<Equal<Jsonify<[string, number]>, [string, number]>>;
type _t4 = Expect<Equal<Jsonify<readonly number[]>, readonly number[]>>;

// 2. `toJSON` is unwrapped: Date and friends arrive as their serialized shape.
type _t5 = Expect<Equal<Jsonify<Date>, string>>;
type _t6 = Expect<Equal<Jsonify<{ at: Date }>, { at: string }>>;
type _t7 = Expect<Equal<Jsonify<Reported>, { id: string; ts: string }>>;

// 3. Members that are always undefined/function/symbol are dropped by
//    JSON.stringify and vanish from the brand. Members that are only
//    possibly undefined stay, carrying `undefined` (an absent key reads
//    undefined on the client).
type _t8 = Expect<Equal<Jsonify<{ keep: string; drop: undefined }>, { keep: string }>>;
type _t9 = Expect<Equal<Jsonify<{ keep: string; drop: () => void }>, { keep: string }>>;
type _t10 = Expect<Equal<Jsonify<{ keep: string; drop: symbol }>, { keep: string }>>;
type _t11 = Expect<Equal<Jsonify<{ v: number | undefined }>, { v: number | undefined }>>;

// 4. Map/Set serialize to an empty object; a bigint body makes stringify
//    throw, so no usable value is promised (`never`).
type _t12 = Expect<Equal<Jsonify<Set<string>>, Record<string, never>>>;
type _t13 = Expect<Equal<Jsonify<Map<string, number>>, Record<string, never>>>;
type _t14 = Expect<Equal<Jsonify<{ id: bigint }>, { id: never }>>;

// 5. Undefined array elements arrive as null.
type _t15 = Expect<Equal<Jsonify<Array<string | undefined>>, Array<string | null>>>;

// 6. Non-JSON slots pass through honestly instead of lying.
type _t16 = Expect<Equal<Jsonify<unknown>, unknown>>;
type _t17 = Expect<Equal<Jsonify<{ any: any }>, { any: any }>>;

// 7. The helper's brand reflects the wire shape end-to-end.
const res = json(200, { at: new Date() });
type _t18 = Expect<Equal<typeof res, TypedResponse<200, { at: string }>>>;

const reportApp = defineApp({
  routes: {
    "/report": {
      GET: route({
        handler: () => json(200, { at: new Date(), name: "r", note: undefined as string | undefined }),
      }),
    },
  },
});
type ReportOutcomes = ClientOutcomes<AppContract<typeof reportApp>["/report"]["GET"]>;
type ReportBody = Extract<ReportOutcomes, { status: 200 }>["body"];
type _t19 = Expect<Equal<ReportBody, { at: string; name: string; note: string | undefined }>>;
