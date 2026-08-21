import type { PathAnalysis } from "../../src/internal/path";
import { analyzePath, isDiagnostic } from "../../src/internal/path";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Runtime analysis returns ordered param names; literal-level extraction for
// client lookup types is derived at the descriptor layer (M3-002).
const analysis = analyzePath("/items/:id");
type Ok = Extract<typeof analysis, PathAnalysis>;
type _names = Expect<Equal<Ok extends { paramNames: ReadonlyArray<string> } ? true : false, true>>;
