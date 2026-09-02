/**
 * toJSON position semantics (M6R10, #321).
 *
 * ECMA-262 `SerializeJSONProperty` invokes `toJSON` at most once per
 * serialization position (passing the property key); a `toJSON` found on the
 * *replacement* value is not re-entered at that position — only member and
 * element positions start fresh hook opportunities. Hook results that are
 * `bigint` throw (never classified as drops). These assertions mirror the
 * runtime ground truth locked in `tests/integration/jsonify-wire.test.ts`.
 */
import type { Jsonify } from "../../src/core/response";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

interface Dropping {
  toJSON(): undefined;
}

interface Outer {
  toJSON(): { keep: string; toJSON(): undefined };
}

type Keyed = { toJSON(key: string): { key: string } };
type HookBig = { toJSON(): bigint };

// 1. The hook runs once; the replacement's own toJSON is NOT re-entered at
//    the same position (runtime: `{"keep":"x"}`).
type _t1 = Expect<Equal<Jsonify<Outer>, { keep: string }>>;
type _t2 = Expect<Equal<Jsonify<{ value: Outer }>, { value: { keep: string } }>>;
type _t3 = Expect<Equal<Jsonify<[Outer]>, [{ keep: string }]>>;

// 2. Key-bearing hook signatures are hooks (runtime passes the property key).
type _t4 = Expect<Equal<Jsonify<Keyed>, { key: string }>>;
type _t5 = Expect<Equal<Jsonify<{ value: Keyed }>, { value: { key: string } }>>;

// 3. A hook returning bigint throws (TypeError) — throw-signaled at the value
//    position (`never`), never drop-classified to `{}` (M6R10).
type _t6 = Expect<Equal<Jsonify<HookBig>, never>>;
type _t7 = Expect<Equal<Jsonify<{ value: HookBig }>, { value: never }>>;

// 4. Direct single-invocation drop behavior is unchanged (M6R9 regression).
type _t8 = Expect<Equal<Jsonify<{ value: Dropping }>, {}>>;
type _t9 = Expect<Equal<Jsonify<[Dropping]>, [null]>>;
type _t10 = Expect<Equal<Jsonify<{ value: Dropping | string }>, { value?: string }>>;

// 5. Unrelated positions are unaffected (M6R7–M6R9 regression).
type _t11 = Expect<Equal<Jsonify<Date>, string>>;
type _t12 = Expect<Equal<Jsonify<{ id: bigint }>, { id: never }>>;
type _t13 = Expect<Equal<Jsonify<{ n: number }>, { n: number | null }>>;
