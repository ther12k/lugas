---
type: Issue Evidence Report
title: 'CA-5 — Framework-generated failures join the typed client contract (RF-3)'
status: complete
tags:
- evidence
- client
- types
- rf-3
---

# CA-5 Evidence Report

Implements RF-3 from `docs/reports/dogfood-realworld-findings.md` per the owner's roadmap: "Framework-generated statuses such as validation and body-parsing failures are absent from the typed client's status union… a server can return a documented error that TypeScript says the frontend cannot receive." Suggested issue title from the roadmap: "Include applicable framework failures in route/client contracts without widening success responses."

## Baseline

Branch base: origin/main `b3a1b34` (after CA-4, PR #407).

`ClientOutcomesFor` derived outcomes solely from the entry's `responses` slot (handler returns + guard short-circuits). A route declaring `body`/`params`/`query`/`headers` schemas produced no failure branches for the framework's own rejections even though every one is documented wire behavior (`src/internal/validation-problem.ts`, M2-009).

## Outcome

`ClientOutcomesFor` now unions the handler/guard outcomes with `FrameworkFailureOutcomes<TEntry>`, derived from the entry's DECLARED capabilities in the contract:

- any declared schema slot (`params`/`query`/`headers`/`body`) → `{ status: 422, body: FrameworkProblemBody<"VALIDATION_FAILED", 422> }`
- a declared standard-schema `body` additionally → `415 UNSUPPORTED_MEDIA_TYPE` and `400 MALFORMED_JSON` (the framework parses the body before validating it)

`FrameworkProblemBody` is the wire shape of `validation-problem.ts`'s Problem Details documents (`type`/`title`/`status`/literal `code`/optional `detail`/`source`/`issues` of `NormalizedValidationIssue`) — asserted compatible with the runtime construction type in tests. Routes without declared schemas gain nothing (asserted for a plain route and a guard-only route). Success types are untouched — widening happens only on the failure side.

### Deliberate exclusions (the roadmap's "known framework errors ≠ arbitrary transport errors")

- **413 is not in the union.** Budget applicability (route `budget`, app `bodyBudget`, serve-time `maxRequestBodySize`) is runtime configuration invisible to the type, and the transport ceiling emits a BARE 413 with an empty body (`docs/body-limits.md`) — promising a Problem body for every 413 would be a lie. Out-of-union statuses still arrive safely: the decoder branches on the actual response (`parse-response.ts`), and the result always carries `status`, payload slot, and `response` (regression-tested with a real transport 413).
- **`form()` routes contribute no branches yet**: today's contract maps form bodies to an undeclared body slot (`contract.ts` `~standard` check); their 415/400/413 outcomes arrive with typed multipart client support (roadmap item 3, tracked as CA-6).

### Compatibility effect

Type-level widening of failure unions for schema-declared routes (per beta policy rule 1, documented here and in `docs/client.md` as the migration note; runtime behavior is unchanged — zero client code paths touched). Existing type-test expectations were updated to the new truth (statuses gaining 400/415/422 where their routes declare schemas); two runtime test files needed honest narrowing (`if (!res.ok) throw`) where they read `.data` on results that are now correctly-unioned — the assertions themselves are unchanged.

## Files changed

Owned (CA-5):

- `src/client/types.ts` — `FrameworkProblemBody`, `FrameworkFailureOutcomes`, `ClientOutcomesFor` extension (type-only; `import type` from internal passes the client graph checker)
- `tests/types/client-framework-failures.test-d.ts` (new) — acceptance type tests incl. negative cases and runtime-shape compatibility
- `tests/integration/client-framework-failures.test.ts` (new) — runtime round-trips: 422 via typed client, 415/400 via raw fetch (the typed client refuses conflicting content types by design — LUGAS_CLIENT_008), bare transport 413 via the fallback
- `tests/types/client-guard-outcomes.test-d.ts`, `tests/types/guard-short-circuit-enrichment.test-d.ts`, `tests/types/bind-services.test-d.ts`, `tests/integration/server-client/contract.test-d.ts` — expectation updates to the widened unions (CA-4's own acceptance test now expects `201 | 409 | 400 | 415 | 422`, proving the two changes compose)
- `tests/integration/client-query-roundtrip.test.ts`, `tests/security/client-header.test.ts` — narrowing guards before `.data` access
- `docs/client.md` — new "Framework-generated failures in the union" section (table + the two honest boundaries)
- `docs/reports/dogfood-realworld-findings.md` — RF-1 and RF-3 dispositions updated with resolution pointers
- `llms.txt`, `llms-full.txt`, `skills/lugas/SKILL.md` — regenerated

Adjacent: none. Protected: none (`docs/client-error-semantics.md` is frozen and deliberately untouched — this change alters no runtime classification).

## Assumptions

- Schema-slot presence in the contract (`input.params`/`query`/`headers`/`body` non-`undefined`) is the correct compile-time capability signal — it is exactly what `MethodBodyInput` et al. already key on.
- `422` for params/query/headers-only routes needs no `400`/`415` companions: those slots have no framework parse step that can fail before validation (URL/header strings; the router matches paths).

## Acceptance mapping (roadmap criteria)

- "A frontend should be able to branch on applicable framework statuses without casts" → type tests 1–2; runtime 422 round-trip branches via `res.ok` narrowing with `error.code` literal-typed.
- "unexpected responses still have an honest, safely decoded fallback" → transport-413 runtime test; decoder truth unchanged (frozen doc).
- "Do not promise that every 413 contains a Lugas Problem Details document" → 413 excluded by design, documented in code + `docs/client.md`.
- "Preserve precise success types rather than widening the entire result to `status: number`" → success members untouched (contract.test-d `_t1` still an exact `Equal` on the success member); only literal failure members were added.

## Exact commands and results

```
bun run typecheck                                        → PASS
bun test tests/integration/client-framework-failures.test.ts → 4 pass, 0 fail
bun run verify                                           → see below
```

## Security considerations

None — type-level only; no runtime path changed (client graph checker passes: the internal import is type-only).

## Known limitations / Not exercised

- Form-body routes and budget-derived 413 branches (see exclusions above; CA-6).
- `ALL`-entries: framework branches derive from the same input slots and apply identically (not separately type-tested).

## Deferred work

- CA-6 (multipart through the typed client) should extend `FrameworkFailureOutcomes` when the contract learns the form-body codec: 415 (non-multipart), 400 (MALFORMED_MULTIPART), 413 (FORM_LIMIT_EXCEEDED — always-Problem; transport 413 stays out).

## Dependency / merge notes

- After CA-4 (PR #407); no file overlap beyond test expectations. No protected files.

## Working-tree state

Clean after commit: files listed above plus `docs/reports/issues/CA-5.md`.
