# Type Fixture Specification (M3-005)

## Purpose

Deterministic stress applications measuring compiler cost and hover readability of the Lugas route contract at realistic application sizes. Fixtures live under `tests/type-performance/fixtures/` and are generated — never hand-edited.

## Generator

- Script: `scripts/generate-type-fixtures.ts`
- Invocation: `bun run scripts/generate-type-fixtures`
- Seed: `424242` (fixed LCG PRNG; regeneration is byte-identical)
- Sizes: 25, 100, 500, and 1,000 routes

## Contract diversity per fixture

| Dimension | Coverage |
|---|---|
| Methods | GET / POST / PUT / PATCH / DELETE (uniform) |
| Path params | ~40% of routes use `/resN/:idN` literals |
| Guards | ~25% of routes carry `authGuard` (401 problem) or `authGuard + adminGuard` (401/403) |
| Body schemas | ~50% of non-GET routes declare a Zod body object |
| Query schemas | ~50% of GET routes declare a Zod query object |
| Raw responses | ~10% of entries are direct native `new Response(...)` values |
| Modules | every 3rd route is composed through a `defineModule` (≈⅓ module routes) |

Density knobs (`guardDensity`, `schemaDensity` in `GenOptions`) are generator parameters for diagnosis; committed fixtures pin `0.25` / `0.5`.

## Rules

- Fixtures are excluded from the published package (`files` whitelist already excludes `tests/`).
- `AppContract<typeof app>` over each fixture is the measured surface for M3-017.
