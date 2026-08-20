/**
 * Hand-rolled type-level assertion helpers for the M0-009 type-contract spike.
 *
 * No external dependencies (expect-type etc.) are allowed in this repository.
 * `Equal` uses the mutually-assignable branded trick which distinguishes
 * `any`, unions, and literal types exactly like expect-type's `Equal`.
 */

export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

export type IsExact<T, U> = Equal<T, U>;

export type Expect<T extends true> = T;

/** Negated assertion: the compile-fail fixtures rely on this plus `@ts-expect-error`. */
export type NotExpect<T extends false> = T;

/** True only for `any` (used by the negative fixtures to prove no `any` leaks). */
export type IsAny<T> = 0 extends 1 & T ? true : false;

export type IsNever<T> = [T] extends [never] ? true : false;

/** Classic distribution check: true when T is a union of 2+ members. */
export type IsUnion<T, U = T> = [T] extends [never]
  ? false
  : T extends unknown
    ? [U] extends [T]
      ? false
      : true
    : never;
