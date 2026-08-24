import { route } from "../../src/core/route";
import type { RouteDescriptor } from "../../src/core/types";
import type { BaseContext } from "../../src/internal/context";

type BaseContextShape = ReturnType<
  typeof import("../../src/internal/context").createContext
> extends never
  ? never
  : {
      readonly request: Request;
      readonly services: unknown;
      readonly params: Record<string, string>;
    };

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Services = { db: string };

const sync = route({ handler: () => new Response("ok") });
const asyncRoute = route({
  handler: async ({ services, params }: { services: Services; params: Record<string, string> }) =>
    Response.json({ id: params.id, db: services.db }),
});

// Descriptor-ness only; the derived context shape is locked in route-context.test-d.ts.
// Derived context default: schema-less routes carry optional-undefined slots.
type _syncIsDescriptor = Expect<
  Equal<
    typeof sync extends RouteDescriptor<
      unknown,
      BaseContextShape
    >
      ? true
      : false,
    true
  >
>;
type _asyncReturnWidens = Expect<Equal<
  Awaited<ReturnType<typeof asyncRoute.handler>> extends Response | TypedResponse ? true : false,
  true
>>;
import type { TypedResponse } from "../../src/core/response";

// A raw plain object is not a descriptor; route() output is.
// @ts-expect-error forged route payload lacks the brand.
const forged: RouteDescriptor = { handler: () => new Response(), before: [] };
