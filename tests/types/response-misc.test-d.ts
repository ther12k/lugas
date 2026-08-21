import { empty, problem, redirect, text } from "../../src/core/response";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const t = text(201, "created");
const e = empty(204);
const p = problem(422, { title: "Invalid", extensions: { field: "q" } });
const r = redirect("/next", 307);

import type { TypedResponse } from "../../src/core/response";
type _text = Expect<Equal<typeof t, TypedResponse<201, "created">>>;
type _empty = Expect<Equal<typeof e, TypedResponse<204, undefined>>>;
type _problem = Expect<Equal<typeof p, TypedResponse<422, import("../../src/core/response").ProblemFields>>>;
type _redirect = Expect<Equal<typeof r, TypedResponse<import("../../src/core/response").RedirectStatus, undefined>>>;

// Non-redirect statuses are rejected at the type level.
// @ts-expect-error 200 is not a RedirectStatus
const badRedirect = redirect("/x", 200);
