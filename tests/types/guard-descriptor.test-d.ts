import { guard } from "../../src/core/guard";
import type { GuardDescriptor } from "../../src/core/types";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type Services = { sessions: { load(): Promise<{ id: string } | null> } };

const enriching = guard<Services, { actor: { id: string } }>({
  name: "requireUser",
  handler: async ({ services }) => {
    const actor = await services.sessions.load();
    return actor ? { actor } : new Response(null, { status: 401 });
  },
});

type _enrichment = Expect<Equal<typeof enriching, GuardDescriptor<Services, { actor: { id: string } }>>>;
type _nameLiteral = Expect<Equal<typeof enriching.name, string>>;

// Forged guard without brand is rejected.
// @ts-expect-error plain object is not a GuardDescriptor
const forged: GuardDescriptor = { name: "x", handler: () => ({}) };

// Handlers returning primitives are rejected by the GuardResult contract.
// @ts-expect-error number continuation is not Enrichment | Response
const bad = guard({ name: "bad", handler: () => 42 });
