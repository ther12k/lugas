import type { GuardDescriptor, MergeGuardEnrichments } from "../../src/core/types";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. Guard enrichment extraction
declare const g1: GuardDescriptor<unknown, { user: { id: string } }>;
declare const g2: GuardDescriptor<unknown, { tenantId: number }>;

type Merged = MergeGuardEnrichments<[typeof g1, typeof g2]>;
type _t1 = Expect<Equal<Merged, { user: { id: string } } & { tenantId: number }>>;

// 2. Guard returns short-circuit Response vs enrichment
declare const shortCircuitGuard: GuardDescriptor<unknown, Response>;
type MergedShortCircuit = MergeGuardEnrichments<[typeof shortCircuitGuard, typeof g1]>;
type _t2 = Expect<Equal<MergedShortCircuit, {} & { user: { id: string } }>>;
