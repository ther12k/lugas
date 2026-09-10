---
type: Owner Decision Record
title: 'ODR-0014: M9-005 Dispatch — Multipart Forms as a Bounded Body Codec'
status: accepted
tags:
- owner-decision
- m9
- multipart
- uploads
---

# ODR-0014: M9-005 Dispatch — Multipart Forms as a Bounded Body Codec

## Context

The M9-004 hardening battery is merged on green `main` (`4f5a298`). Per the
owner-directed sequence (ODR-0010), item (d) opens the final planned battery
group, first item: multipart parsing with bounded consumption. Bun's native
`formData()` is unbounded — the entire body is consumed before an application
can refuse it — which makes uploads the one request class outside the ADR-0019
budget guarantee. The framework answer is a bounded body codec that reuses the
platform parser.
[ADR-0030](../okf/decisions/0030-multipart-forms.md) fixes the contract.

## Decision

1. **M9-005 ([#372](https://github.com/ther12k/lugas/issues/372)) is
   dispatched** under ADR-0030: `body: form(config?)` — a first-party body
   descriptor parsing `multipart/form-data` within the effective body budget
   (read stream-wise, refused at the cap; `Content-Length` over budget refused
   pre-read), parsed by the native `FormData` implementation over the buffered
   bytes. `ctx.body = { fields, files }` with native `File` values;
   last-wins repeated names; explicit `maxFields`/`maxFiles`/`maxFileSize`
   limits (`413 FORM_LIMIT_EXCEEDED`); malformed multipart
   (`400 MALFORMED_MULTIPART`); wrong media type (existing `415`). No
   hand-rolled MIME parser, no streaming part events, no spooling controls.
2. **Sequence confirmation:** the remaining item-(d) batteries — OpenTelemetry
   integration hooks (no SDK dependency), compression/ETag, and the rate-limit
   contract (storage app-owned) — each still require their own issue, ADR,
   and ODR before implementation starts. Once item (d) lands, feature
   development stops per the owner's stop-rule and the project prepares for
   stability.
3. **Protected-file authority (this issue only):** M9-005 may edit
   `src/index.ts` (protected) for the additive `form` export and
   `FormConfig`/`MultipartBody` type lines, plus
   `src/internal/compile-pipeline.ts` and `src/internal/validate-body.ts` as
   adjacent owned-by-this-issue files (the body-slot codec integrates where
   validation runs; all changes additive, existing JSON-body behavior
   unchanged and covered by the full suite). `package.json` and `bun.lock`
   must remain **untouched**; `src/client/index.ts`,
   `src/testing/index.ts`, `tsconfig*.json`, and workflows remain untouched.
   Diagnostics goldens regenerate via `scripts/update-goldens.ts --apply`
   with the reason recorded in the evidence report.

## Effect

- The M9-005 worktree may be created from a green base containing this
  record (`docs/m9-005-governance` merge).
- On completion with full evidence, the roadmap's multipart row flips to
  shipped-on-`main`, and `docs/uploads.md` joins the synced site pages.
- npm publication, dist-tag moves, and any new release candidate remain
  owner-controlled actions.
