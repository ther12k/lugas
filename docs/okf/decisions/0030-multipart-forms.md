---
type: Architecture Decision Record
title: 'ADR-0030 — Multipart Forms as a Bounded First-Party Body Codec'
status: accepted
tags:
- adr
- architecture
- multipart
- uploads
- '0030'
generated:
  by: zcode/glm
  at: '2026-09-10T00:00:00+07:00'
---

# ADR-0030 — Multipart Forms as a Bounded First-Party Body Codec

## Status

Accepted by owner decision (ODR-0014, `docs/owner-decisions/m9-005-dispatch.md`, 2026-09-10), dispatching issue [#372](https://github.com/ther12k/lugas/issues/372) (M9-005). First item of (d), the final planned battery group of the ODR-0010 sequence.

## Context

File uploads are table stakes for real applications, and Bun parses `multipart/form-data` natively (`Request.formData()` → `FormData` with native `File` parts). Two properties of that native path keep it from being the framework answer as-is:

1. **Unbounded consumption.** `formData()` consumes the entire body before the application can refuse it. The ADR-0019 budget contract exists precisely to bound consumption (fail `413` *before* validation/handlers), but it only covers framework-parsed JSON bodies today. An uploads story that ignores budgets would make the framework's flagship memory guarantee opt-out for the heaviest requests.
2. **No honest defaults.** Hand-rolled handler code must re-decide, per route: media-type checks, field/file limits, and error envelopes — or skip them.

The counter-pressure is parser scope: hand-rolling a MIME multipart parser is a security swamp (boundary smuggling, header folding, quoting corner cases) and a maintenance anchor. The owner's constraint set (no dependencies, native web APIs stay available) points to the same resolution as the rest of the framework: **bound the bytes ourselves, parse with the platform.**

## Decision

1. **`body: form(config?)`** — a first-party body descriptor for the existing body slot. Its presence opts the route into `multipart/form-data` parsing and types `ctx.body` as `{ fields: Record<string, string>; files: Record<string, File> }`:
   - `fields` holds text parts; `files` holds file parts as **native `File`** values (`name`, `type`, `size`, `arrayBuffer()`, `stream()` — web-API truth, unwrapped).
   - Repeated part names collapse **last-wins**, mirroring `parseCookies` (documented; the native `request.formData()` remains available for applications that need full multiplicity).
   - A `body` slot holding `form()` counts as a declared framework-parsed body for every existing contract: manifest capability, `route({ budget })` requirement direction, and pipeline ordering.
2. **Bounded consumption (the point of the battery):**
   - A `Content-Length` header above the effective budget is refused **before reading** — `413 BODY_BUDGET_EXCEEDED` Problem Details.
   - The body is read stream-wise up to the effective budget (app `bodyBudget` / route `budget`, clamped by the server ceiling per ADR-0019); crossing the cap aborts the read — `413`, never a partial parse.
   - Only bytes within the cap are ever handed to a parser.
3. **Parse with the platform.** The buffered bytes are re-wrapped in a synthetic request and parsed by Bun's `FormData` implementation. Lugas ships **no MIME parser** — boundary, quoting, and encoding corner cases stay with the maintained native implementation.
4. **Form limits, explicit and fail-closed:** `maxFields` (default 64), `maxFiles` (default 16), `maxFileSize` (default 10 MiB). Exceeding any limit → `413` Problem Details `FORM_LIMIT_EXCEEDED`. These are shape limits distinct from the byte budget (both are `413` — "too large" semantics; the codes distinguish which limit fired). Limits are declaration-time validated: non-integer or non-positive values throw `LUGAS_FORM_001` at `form()` creation.
5. **Honest failures:** a body with a `multipart/form-data` content type that fails to parse → `400` Problem Details `MALFORMED_MULTIPART`; a non-multipart content type (or missing boundary) on a `form()` route → existing `415 UNSUPPORTED_MEDIA_TYPE`. Neither reaches the handler.
6. **Non-goals:** no streaming/incremental part events (handlers get the complete body), no disk-spooling controls (Bun's `File` behavior is the platform's), no `multipart/related` or nested MIME, no malware scanning, no field-name schema language (plain string maps; validate values with Standard Schema in the handler where needed).
7. **Packaging:** additive root exports (`form` value; `FormConfig`, `MultipartBody` types); no dependencies; `package.json`/`bun.lock` untouched.
8. **Diagnostics:** `LUGAS_FORM_001` (invalid form limits) — catalogued; goldens regenerated with the reason recorded. Wire failures reuse the existing envelope codes (`BODY_BUDGET_EXCEEDED`, `UNSUPPORTED_MEDIA_TYPE`) plus the two new Problem Details code strings (`MALFORMED_MULTIPART`, `FORM_LIMIT_EXCEEDED`), which are wire codes, not thrown-diagnostic catalog entries.

## Consequences

- Positive: uploads join the framework's memory story — the heaviest request class is now budget-bounded, not the exception to it.
- Positive: the handler contract stays one vocabulary (`ctx.body`), with native `File` objects requiring zero adaptation to stream/forward.
- Cost/tradeoff: multipart bodies buffer within the cap before parsing (no incremental part handling). Bounded buffering is the honest cost of refusing before parsing; spooling behavior for large caps is the platform's.
- Cost/tradeoff: last-wins field/file maps lose multiplicity; applications needing repeated names use the documented native escape hatch.
- Compatibility effect: one additive body descriptor, one diagnostic, two wire codes; the body slot's pipeline position is unchanged.

## Alternatives considered

- **Wrapping/advising `request.formData()` directly (handler-callable helper):** rejected — unbounded consumption remains until the helper is called, and 413/415 handling reverts to per-handler boilerplate; the body slot is where budgets and pipeline ordering already live.
- **Hand-rolled streaming MIME parser:** rejected — security swamp (boundary smuggling, folding, quoting), an audit surface forever, for zero contract benefit over bounded-buffer + native parse.
- **`files: File[]` arrays with `getField(name)` accessors:** rejected — accessor-shaped bodies invent a second collection vocabulary; plain maps compose with `Object.keys`/`in` naturally, and multiplicity has the native escape hatch.
- **Separate `multipart` route key beside `body`:** rejected — two config surfaces for one slot would let `body` and `multipart` disagree; the body slot is single-source.
- **Disk-spooling configuration (`spoolToDisk: true`):** rejected — platform behavior; exposing it would promise what Bun controls.

## Evidence

Implementation issue [#372](https://github.com/ther12k/lugas/issues/372) (M9-005) delivers behavior tests (fields/files typing, repeated names, 415/400/413 paths, each form limit, budget composition, diagnostics), `docs/uploads.md`, and `examples/uploads/`; evidence report `docs/reports/issues/M9-005.md`.

## Revisit trigger

If real uploads demonstrably need multiplicity or incremental handling, a `form.all()` accessor or streaming variant can be added by ADR amendment with benchmarks — never by weakening the bounded-read guarantee.
