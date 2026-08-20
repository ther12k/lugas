# M0 Type Contract Spike

## Candidates

- A: explicit generic module/guard factories.
- B: stateless bound definition kit (selected).
- C: inline contextual typing.

## Recommendation

Use stateless bound factories for M1: explicit object descriptors keep public APIs searchable while generic parameters flow from `defineModule`/`guard`; retain explicit generic escape hatch for complex cross-module contexts. Inline contextual typing remains ergonomic but becomes fragile across separately declared modules.

## Evidence

`spikes/type-contract/candidates.ts` proves service-bound module/guard factories, response status/body typing, and method/path lookup. Runtime helper erases to plain objects.

## Scale

TypeScript 7.0.2 strict compilation on Linux passed for the prototype. Full 25/100/500 route compiler benchmark remains M3-017 harness work; no performance claim made here.
