import type { TypedResponse } from "../../src/core/response";
import { json } from "../../src/core/response";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const res = json(201, { data: "x" });
type _status = Expect<Equal<TypedResponse<201, { data: string }>, typeof res>>;
type _isResponse = Expect<Equal<typeof res extends Response ? true : false, true>>;

// Widening: assigning to a broader typed response keeps phantom facts erased.
const wider: TypedResponse<number, unknown> = res;
type _wider = Expect<Equal<typeof wider.status, number>>;
