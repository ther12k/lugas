/**
 * JSON serialization-honest response typing (M6R7–M6R9).
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

interface Dropping {
  toJSON(): undefined;
}

// 1. JSON-safe bodies round-trip unchanged — except that a general `number`
//    widens to `number | null` (NaN/±Infinity serialize as null, M6R9).
type _t1 = Expect<
  Equal<Jsonify<{ a: string; b: number; c: boolean; d: null }>, { a: string; b: number | null; c: boolean; d: null }>
>;
type _t2 = Expect<Equal<Jsonify<string[]>, string[]>>;
type _t3 = Expect<Equal<Jsonify<[string, number]>, [string, number | null]>>;
type _t4 = Expect<Equal<Jsonify<readonly number[]>, readonly (number | null)[]>>;

// 2. Finite numeric literals stay exact (M6R9).
type _t2b = Expect<Equal<Jsonify<{ lit: 42 }>, { lit: 42 }>>;
type _t2c = Expect<Equal<Jsonify<{ mixed: 1 | 2 }>, { mixed: 1 | 2 }>>;

// 3. `toJSON` is unwrapped: Date and friends arrive as their serialized shape.
type _t5 = Expect<Equal<Jsonify<Date>, string>>;
type _t6 = Expect<Equal<Jsonify<{ at: Date }>, { at: string }>>;
type _t7 = Expect<Equal<Jsonify<Reported>, { id: string; ts: string }>>;

// 4. Members that always serialize to undefined (undefined/function/symbol/
//    void) are dropped by JSON.stringify and vanish from the brand. Members
//    that only MAY drop become optional properties (M6R9): the decoded value
//    can be `{}`, so a required key would lie structurally.
type _t8 = Expect<Equal<Jsonify<{ keep: string; drop: undefined }>, { keep: string }>>;
type _t9 = Expect<Equal<Jsonify<{ keep: string; drop: () => void }>, { keep: string }>>;
type _t10 = Expect<Equal<Jsonify<{ keep: string; drop: symbol }>, { keep: string }>>;
type _t11 = Expect<Equal<Jsonify<{ v: number | undefined }>, { v?: number | null }>>;

// 5. Map/Set serialize to an empty object; a bigint body makes stringify
//    throw, so no usable value is promised (`never` — documented throw-signal).
type _t12 = Expect<Equal<Jsonify<Set<string>>, Record<string, never>>>;
type _t13 = Expect<Equal<Jsonify<Map<string, number>>, Record<string, never>>>;
type _t14 = Expect<Equal<Jsonify<{ id: bigint }>, { id: never }>>;

// 6. Array elements that serialize to undefined arrive as null — including
//    function/symbol elements (M6R8) and toJSON chains ending in undefined
//    (M6R9).
type _t15 = Expect<Equal<Jsonify<Array<string | undefined>>, Array<string | null>>>;
type _t20 = Expect<Equal<Jsonify<[() => void]>, [null]>>;
type _t21 = Expect<Equal<Jsonify<[symbol]>, [null]>>;
type _t22 = Expect<Equal<Jsonify<[string, () => void]>, [string, null]>>;
type _t23 = Expect<Equal<Jsonify<readonly (string | (() => void))[]>, readonly (string | null)[]>>;
type _t28 = Expect<Equal<Jsonify<[Dropping]>, [null]>>;

// 7. toJSON results that serialize to undefined propagate the drop through
//    member and element positions (M6R9).
type _t29 = Expect<Equal<Jsonify<{ value: Dropping }>, {}>>;
type _t30 = Expect<Equal<Jsonify<{ value: Dropping | string }>, { value?: string }>>;

// 8. Union members that may serialize to undefined become optional properties
//    (M6R9) — the decoded value can be `{}`, which is not assignable to a
//    required-property type.
type _t24 = Expect<Equal<Jsonify<{ value: string | (() => void) }>, { value?: string }>>;
type _t25 = Expect<Equal<Jsonify<{ value: string | symbol }>, { value?: string }>>;
type _t26 = Expect<Equal<Jsonify<{ value: { id: string } | undefined | (() => void) }>, { value?: { id: string } }>>;

// 9. void-only members are always dropped by serialization.
type _t27 = Expect<Equal<Jsonify<{ value: void }>, {}>>;

// 10. Non-JSON slots pass through honestly instead of lying.
type _t16 = Expect<Equal<Jsonify<unknown>, unknown>>;
type _t17 = Expect<Equal<Jsonify<{ any: any }>, { any: any }>>;

// 11. The helper's brand reflects the wire shape end-to-end.
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
type _t19 = Expect<Equal<ReportBody, { at: string; name: string; note?: string }>>;
