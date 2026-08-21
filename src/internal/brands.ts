/**
 * Private nominal brands for Lugas descriptors (M1-001).
 *
 * The symbol is never exported, so a plain object literal cannot satisfy a
 * branded descriptor type without going through the public factories. This
 * keeps `RouteDescriptor`, `GuardDescriptor`, and `LugasApp` nominal even
 * though their payload fields are structurally ordinary.
 */
declare const lugasBrand: unique symbol;

export type Branded<T, B extends string> = T & {
  readonly [lugasBrand]: B;
};

/** Narrow a structural payload to a branded descriptor. Factory-side only. */
export function brand<T, B extends string>(value: T, _tag: B): Branded<T, B> {
  return value as Branded<T, B>;
}
