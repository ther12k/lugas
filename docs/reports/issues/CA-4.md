---
type: Issue Evidence Report
title: 'CA-4 — bindServices(): service-bound route/guard factories (RF-1)'
status: complete
tags:
- evidence
- types
- services
- rf-1
---

# CA-4 Evidence Report

Implements RF-1 from `docs/reports/dogfood-realworld-findings.md` as prioritized by the owner's roadmap (2026-09-12): "`defineApp({ services })` does not propagate the service type back into independently constructed route descriptors… The working patterns are an explicit `route<{ database: typeof db }>` type argument — which pins every other generic slot to `undefined` when used alone — or the repo's own clean-room cast (`ctx.services as AppServices`)."

## Baseline

Branch base: origin/main `a68552b` (after CA-R1, PR #406).

Pre-existing state: no cast-free way to type `ctx.services` on a route that also declares schemas/guards. `docs/services.md` documented the local cast as the pattern (its example used `ctx.services as Services`). No API existed to bind services once.

## Outcome

New additive factory `bindServices<TServices>(): ServiceBound<TServices>` returning bound `route` and `guard` functions (`src/core/bind-services.ts`). The bound functions declare the same generic parameters as the plain factories **minus `TServices`** and forward every parameter explicitly to `route()`/`guard()` — inference (params/query/headers/body/guards/return, with `const` modifiers preserved) happens at each call exactly as with the plain factories, while `TServices` stays fixed. Runtime is unchanged: the bound functions are pure delegation, so validation diagnostics, freezing, and branding have exactly one implementation. No container, no runtime service lookup — binding is compile-time only.

### API-name note (the roadmap deferred the name to a design review)

`bindServices` follows the repo's naming grammar: lowercase verb-ish factory names (`route`, `guard`, `service`, `form`), object-valued returns (the "small, explicit, object-based" rule), and it names the operation the roadmap specified ("developers bind their application's service type once"). The return type is exported as `ServiceBound<TServices>`. Alternatives considered and rejected: `withServices` (prepositional, reads worse at call sites in module scope), `defineRoutes` (collides with `defineApp`/`defineModule` naming, which imply descriptor construction, not generic binding), and extending `route()` with a partial-generics overload (not expressible — partial type-argument lists do not exist in TypeScript).

### Scope boundary

`websocket()` descriptors take the same `RouteContext<TServices, …>` shape and have the same ergonomics gap; per the roadmap's explicit "route/guard factory" scope, a bound `websocket` is deferred (see Deferred work).

## Files changed

Owned (CA-4):

- `src/core/bind-services.ts` (new) — `ServiceBound<TServices>` type + `bindServices()` factory
- `tests/types/bind-services.test-d.ts` (new) — acceptance type tests
- `tests/unit/bind-services.test.ts` (new) — delegation/runtime tests
- `docs/services.md` — RF-1 section rewritten: `bindServices` is the canonical cast-free pattern; the cast note is replaced
- `docs/api-reference.md` — export table + types row
- `llms.txt`, `llms-full.txt`, `skills/lugas/SKILL.md` — regenerated (gate artifacts)

Protected (`src/index.ts`): adds `export { bindServices }` and `export type { ServiceBound }` — this issue owns that export; no other protected file touched.

Adjacent: none.

## Assumptions

- The bound `guard()` must accept handlers that enrich context exactly like plain `guard()` (same `GuardConfig`), and plain (unbound) guards must compose with bound routes — verified in tests; `GuardDescriptor<unknown, …>` is assignable to `GuardDescriptor<TServices, any>` under strict function types (parameter contravariance).
- `ctx.params` keeps its documented `SchemaOutput & Record<string, unknown>` shape (raw params remain index-addressable) — asserted as such, not widened.

## Acceptance mapping (roadmap criteria)

- "One route must simultaneously infer its database/job-manager service, validated body, transformed parameters, authenticated user, and literal response statuses — without `as`, `any`, or manually specifying every generic parameter" → `tests/types/bind-services.test-d.ts`: `Equal` assertions on `ctx.services` (both members), coerced `params: { id: number } & Record<string, unknown>`, defaulted `query`, zod `body`, plain-guard enrichment `user`, and client contract statuses `Equal<201 | 409>` with body member types. No `as`/`any`/type arguments appear in the route declarations.
- "Module composition" → bound routes inside `defineModule` reach `AppContract` through `MergeModulesRoutes` with literal statuses (asserted `Equal<200>`).
- "Compile-time performance" → `tsc --noEmit`: 1.9s with the new factory + tests vs 1.6s on main (whole-repo, single run each); the factory is instantiated only at use sites.
- "This should not introduce a dependency-injection container or runtime service lookup" → the factory returns two delegating functions; runtime behavior asserted identical (diagnostics codes, frozen shapes, end-to-end serve with live services).

## Exact commands and results

```
bun run typecheck                       → PASS (no output)
bun test tests/unit/bind-services.test.ts → 4 pass, 0 fail
bun run verify                          → exit 0 (typecheck/test/docs/diff/agent-docs PASS)
(time) tsc --noEmit CA-4 vs main        → 1.887s vs 1.557s
```

## Security considerations

None — additive type-level ergonomics; no runtime path changes (delegation asserted by diagnostic-code equality).

## Known limitations / Not exercised

- `websocket()` descriptors are not bindable yet (scope).
- Cross-file sharing of one bound factory instance is type-only; each `bindServices<T>()` call creates new closures (trivial cost, no caching attempted — no premature optimization).

## Deferred work

- Bound `websocket` in the same factory if the ergonomics gap proves annoying in practice.
- RF-1's second-order idea from the dogfood report (defineApp back-propagation of services into route descriptors) remains out of scope: not expressible without changing how route declarations type-check (descriptor construction precedes `defineApp`).

## Dependency / merge notes

- Includes origin/main through CA-R1 (PR #406) — the typecheck repair this work depend- ed on. `src/index.ts` (protected) edited under this issue's ownership.

## Working-tree state

Clean after commit: files listed above plus `docs/reports/issues/CA-4.md`.
