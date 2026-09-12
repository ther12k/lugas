---
type: Issue Evidence Report
title: 'CA-6 — Multipart uploads through the typed client: formBody() codec, form() multiplicity mode, failure branches (RF-3 item 3)'
status: complete
tags:
- evidence
- client
- multipart
- rf-3
---

# CA-6 Evidence Report

Implements roadmap item 3 ("Complete multipart uploads through the typed client"): server-side multipart parsing existed (M9-005/ADR-0030), but `RouteInputContract` recognized bodies only through the Standard Schema marker, and the client serialized every declared body as JSON — so the canonical typed-client path could not upload a multipart form.

## Baseline

Branch base: origin/main `f1f1d1b` (after CA-5, PR #408).

Pre-existing state: `form()` descriptors lived outside the contract (client input for a form route was `undefined` — no body required, nothing checked); `buildRequestInit` JSON-serialized any declared body and rejected conflicting content types; repeated part names collapsed last-wins with no multiplicity option; the client union carried no multipart failure branches.

## Outcome

Four coordinated pieces, no new diagnostic codes:

1. **`formBody()` wrapper (`src/client/form-body.ts`, exported from `lugas/client`)** — the explicit RUNTIME discriminator that selects the multipart encoder. The route contract is compile-time only and erased before dispatch, so generics alone cannot pick the encoder (the roadmap's stated constraint). It wraps a plain values object: native `File`/`Blob` values are preserved as parts, scalars stringify, flat arrays send one part per element under the same field name (nested arrays rejected, never silently flattened), omitted keys send nothing. The wrapper and its arrays are frozen at creation so later mutation cannot contradict the sent request.
2. **Contract recognition (`src/core/contract.ts`)** — a `form()` body slot now maps to `FormBodyInput`, so the client call type REQUIRES `body: formBody({...})` for form routes (compile error otherwise — closing the "no end-to-end path" gap from both sides).
3. **Multipart encoder path (`src/client/request.ts`)** — a `formBody`-shaped declared body converts to native `FormData`; the client never sets `content-type` (the platform generates the boundary) and ANY caller content type is a `LUGAS_CLIENT_008` conflict. The JSON path is untouched. The client graph checker passes: the wrapper imports core types type-only.
4. **`form({ repeated: "preserve" })` (`src/core/form.ts`, `src/internal/parse-form-body.ts`, `src/internal/context.ts`)** — an explicit opt-in multiplicity mode adding `groups` (every part per name, wire order) to the handler body; `fields`/`files` stay last-wins in BOTH modes and the default contract is unchanged (M9-005 preserved, never silently changed). Handler body types are mode-precise: `MultipartBody` vs `MultipartBodyPreserved`.

**Client union (extends CA-5):** form routes contribute `415` (non-multipart media), `400 MALFORMED_MULTIPART`, and `413` with a Problem body (`FORM_LIMIT_EXCEEDED | BODY_BUDGET_EXCEEDED` — always-Problem because the form limits are unconditional `form()` configuration and the budget problem is Lugas-level). No `422` from a form body itself (no schema); params/query/headers schemas on the same route still contribute `422` through their own branches. The bare transport-ceiling 413 stays out of every union, as documented since CA-5.

## Files changed

Owned (CA-6):

- `src/core/form.ts` — `FormRepeated`, mode-typed `FormDescriptor<TRepeated>`, `AnyFormDescriptor`, `FormBodyInput`/`FormBodyValue`/`FormBodyValues`, `MultipartBodyGroups`/`MultipartBodyPreserved`, `repeated` config + validation
- `src/core/contract.ts` — form body slot → `FormBodyInput`
- `src/client/form-body.ts` (new), `src/client/request.ts` (multipart encoder path), `src/client/types.ts` (`MultipartFailureOutcomes` + dispatch), `src/client/index.ts` (`formBody` + types; protected export owned by this issue)
- `src/internal/context.ts` (preserve-aware `DeclaredSlot`), `src/internal/parse-form-body.ts` (groups building)
- `tests/types/client-form-body.test-d.ts` (new), `tests/unit/client-form-body.test.ts` (new), `tests/forms/client-form.test.ts` (new end-to-end)
- `docs/client.md` (multipart section + boundary table row), `docs/uploads.md` (multiplicity + client sections), `docs/api-reference.md`, `docs/reports/dogfood-realworld-findings.md` (RF-3 fully resolved)
- `llms.txt`, `llms-full.txt`, `skills/lugas/SKILL.md` — regenerated

Adjacent: none. Protected: `src/client/index.ts` (owned by this issue).

## Assumptions

- Bun's `FormData` may store structural copies of `File` parts; the contract is value preservation (name/type/bytes), not instance identity — asserted accordingly.
- `413` joins the union for form routes only: both 413 codes there carry Problem bodies by construction; the JSON-route 413 exclusion (CA-5) is unaffected.
- A payload deliberately faking `{ multipart: true, values }` on a JSON route fails loudly server-side (typed 415), never silently succeeds.

## Acceptance mapping (roadmap criteria)

- "Send three files under one field name; receive all three" → `tests/forms/client-form.test.ts` first test (3 groups via `repeated: "preserve"`, last-wins view intact).
- "Enforce actual part-count and byte limits" → typed `413 FORM_LIMIT_EXCEEDED` round-trip (maxFileSize 64 vs 128-byte file); field/file limits unchanged from M9-005.
- "Handle rejection through the typed client" → `res.ok === false` narrowing with literal `error.code`; 415/400 wire round-trips via raw fetch.
- "Preserve native File/Blob values, platform-generated boundary, cancellation support, same typed response/error structure" → unit encoder tests + cancellation test (`init.signal`).
- "Explicit multiplicity mode without silently changing existing behavior" → `repeated` opt-in; default last-wins round-trip pinned; `form()` config validation rejects unknown modes (`LUGAS_FORM_001`).

## Exact commands and results

```
bun run typecheck                                    → PASS
bun test tests/unit/client-form-body.test.ts tests/forms/ → 23 pass, 0 fail (incl. pre-existing forms.test.ts)
bun run scripts/check-client-graph.ts                → CLIENT-GRAPH-OK
bun run verify                                       → see below
```

## Security considerations

No new parse surface (platform `FormData` on both ends). Boundary ownership prevents header spoofing through the typed path; conflicting content types fail closed (`LUGAS_CLIENT_008`); no diagnostic message includes header values.

## Known limitations / Not exercised

- Browser-artifact E2E (the prebuilt `lugas-client.esm.js`) exercises the same encoder source via the stage-two suite; a dedicated browser-multipart screenshot test was not added.
- `Blob` parts always send with their own type/name; explicit per-part content-type overrides are not configurable (platform semantics).

## Deferred work

- A streaming MIME parser, resumable uploads, storage backends — explicitly out of scope per the roadmap ("finish ordinary bounded uploads end to end first").
- Verified Vite/React starter (roadmap item 7) can now include a real multipart upload in its acceptance checklist.

## Dependency / merge notes

- After CA-5 (PR #408). No file overlap beyond `docs/client.md` (extends the CA-5 section).

## Working-tree state

Clean after commit: files listed above plus `docs/reports/issues/CA-6.md`.
