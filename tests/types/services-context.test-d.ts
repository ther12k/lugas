import type { BaseContext } from "../../src/internal/context";
import type { RouteHandler } from "../../src/core/types";

type Services = { users: { find(id: string): Promise<{ id: string } | null> } };
type Params = { id: string };
type Expect<T extends true> = T;

const handler: RouteHandler<Services, { actor: { id: string } }> = ({ request, services, params, actor }) => {
  void request;
  void services.users.find(params.id!);
  return Response.json({ actor: actor.id });
};

const context = {} as BaseContext<Services, Params>;
type _serviceIdentity = Expect<typeof context.services extends Services ? true : false>;
type _paramIdentity = Expect<typeof context.params extends Params ? true : false>;

// No service locator/proxy: context.services is the exact application object.
void handler;
