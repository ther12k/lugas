import { route } from "../../src/core/route";
import type { RouteDescriptor } from "../../src/core/types";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Services = { db: string };

const sync = route({ handler: () => new Response("ok") });
const asyncRoute = route({
  handler: async ({ services, params }: { services: Services; params: Record<string, string> }) =>
    Response.json({ id: params.id, db: services.db }),
});

type _syncIsDescriptor = Expect<Equal<typeof sync extends RouteDescriptor<unknown, unknown> ? true : false, true>>;
type _asyncReturnWidens = Expect<Equal<
  Awaited<ReturnType<typeof asyncRoute.handler>> extends Response | TypedResponse ? true : false,
  true
>>;
import type { TypedResponse } from "../../src/core/response";

// A raw plain object is not a descriptor; route() output is.
// @ts-expect-error forged route payload lacks the brand.
const forged: RouteDescriptor = { handler: () => new Response(), before: [] };
