/**
 * Compile-pass/fail fixtures for the canonical declaration syntax (M1-001).
 *
 * `.test-d.ts` files are checked by `bunx tsc --noEmit`; they contain no
 * runtime assertions. Payloads are typed first so handler context infers,
 * then branded via the internal marker — mirroring how the M1-004+ factories
 * will produce descriptors from user input.
 */
import type {
  GuardDescriptor,
  GuardHandler,
  LugasApp,
  ModuleDescriptor,
  RouteDescriptor,
  RouteHandler,
} from "../../src/core/types";

type Services = { db: string };
type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const guardPayload: { name: string; handler: GuardHandler<Services, { actor: { id: string } }> } = {
  name: "requireUser",
  handler: async ({ services }) => (services.db ? { actor: { id: "u1" } } : new Response()),
};
const guard = guardPayload as unknown as GuardDescriptor<Services, { actor: { id: string } }>;

const routePayload: { handler: RouteHandler<Services, { actor: { id: string } }> } = {
  handler: async ({ params, actor }) =>
    params.id === actor.id ? new Response("ok") : new Response("deny", { status: 403 }),
};
const route = routePayload as unknown as RouteDescriptor<Services, { actor: { id: string } }>;

const modulePayload: { name: string; routes: Readonly<Record<string, unknown>> } = {
  name: "users",
  routes: { "/users/:id": { GET: route } },
};
const usersModule = modulePayload as unknown as ModuleDescriptor<Services>;

const appPayload: { services: Services } = { services: { db: "pg" } };
const app = appPayload as unknown as LugasApp<Services>;

// Type-level assertions.
type _guardName = Expect<Equal<typeof guard.name, string>>;
type _appServices = Expect<Equal<typeof app.services, Services>>;

// @ts-expect-error forged plain object: missing brand cannot be assigned.
const forgedGuard: GuardDescriptor = { name: "x", handler: () => ({}) };

// @ts-expect-error forged app: structural object without brand.
const forgedApp: LugasApp = { services: {} };

// @ts-expect-error descriptor payloads are readonly.
usersModule.name = "renamed";
