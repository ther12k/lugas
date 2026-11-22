---
type: Issue Evidence Report
title: BETA6-P0-TRIAGE — Hardening-plan P0 verification and fixes
status: current
tags:
- hardening
- openapi
- lifecycle
- telemetry
- docs
---

# BETA6-P0-TRIAGE — Hardening-plan P0 verification and fixes

## Baseline and outcome

The production-hardening plan produced against `134f163` listed six P0
findings, explicitly unverified ("planning pass, no tests executed"). Each
claim was re-verified against the current branch (`46bb118`) by reading the
source and, where runtime behavior was claimed, by reproduction. Five were
confirmed and fixed; one is recorded as an owner decision.

| ID | Claim | Verification | Disposition |
|---|---|---|---|
| P0-01 | OpenAPI extraction required `~standard.jsonSchema` to be a function; the standard (and zod 4.4.3, the pinned test validator) exposes an object with `input()`/`output()` converters | Confirmed at `src/internal/openapi.ts` and by runtime probe of zod 4.4.3 | Fixed: both forms honored; request slots prefer `input()`; proposal `{ jsonSchema, dialect }` envelope unwrapped only when the `dialect` marker is present; async converters degrade to the documented fallback |
| P0-02 | Guard docs claimed guards precede body validation; the pipeline validates body first | Confirmed: `docs/guards.md` vs `compile-pipeline.ts` (body then guards) | Fixed: documentation corrected to the implemented ordering, with an explicit note that pre-body cheap rejection is a deployment concern, not a guard guarantee |
| P0-03 | The SSE recipe's detached producer had no rejection path and no explicit close on terminal completion | Confirmed in `docs/sse.md` | Fixed: recipe closes the writer on both producer failure and normal completion; no unhandled detached rejection |
| P0-04 | Shutdown waited for initialization before its deadline clock started, and disposal was unbounded | Confirmed: `lifecycle.ts` awaited `initPromise` before computing the deadline; Phase 3 disposal had no bound | Fixed: one budget over the whole shutdown (init wait + drain + disposal); honest `deadlineExpired` outcomes; never-settling services reported in `disposalFailures`, later services recorded as not attempted, never falsely disposed |
| P0-05 | Strong ETags are computed pre-compression and reused across encodings, which RFC 9110 §8.8.1–§8.8.3 reserves to per-representation validators | Confirmed as current, documented behavior (ADR-0033: "encoding-independent") | **Owner decision, not changed here**: fixing it means choosing between encoding-specific strong validators, weak validators when compression may vary, or disabling validators on encoded responses — a public behavior change to a shipped, tested feature. Recorded for an ADR; the wildcard/weak-comparison/SSE work in BETA6-REVIEW-2 already fixed the conditional-request defects around it |
| P0-06 | Telemetry callbacks (and by extension logging sinks) are invoked directly; exceptions escape the wrapper | Confirmed by reproduction: a throwing `onRequestStart` turned a valid route into Bun's 500 page | Fixed: all telemetry callbacks and the logging sink are isolated (`safeEmit`/try-catch); the failure is reported to stderr once and the request keeps its response |

The plan's P0-05 streaming/buffering half (ETag buffering SSE) was already
fixed in `cf27017` and hardened in `BETA6-REVIEW-2`; only the
encoding-shared-validator question remains (above).

## Files and acceptance

- Owned: `src/internal/openapi.ts` (converter-object extraction),
  `src/internal/lifecycle.ts` (one-budget shutdown with `raceDeadline`),
  `src/internal/telemetry.ts` (`safeEmit` isolation), `src/internal/logging.ts`
  (sink isolation), this report.
- Adjacent: `tests/openapi/openapi.test.ts` (real-zod 4 regression test),
  `tests/lifecycle/lifecycle.test.ts` (never-settling init and disposer,
  both bounded), `tests/telemetry/telemetry.test.ts` (throwing callbacks and
  sink never change the response), `docs/services.md`, `docs/guards.md`,
  `docs/sse.md`, `CHANGELOG.md`. No protected file changed.

## Verification

- Red/green: the zod 4 OpenAPI test fails with the openapi fix stashed;
  the telemetry isolation repro (throwing `onRequestStart` → 500) was
  demonstrated pre-fix and passes post-fix; the lifecycle budget tests use
  a 2s race guard that would report `HUNG` against the unbounded code.
- `bun test tests/telemetry tests/logging tests/lifecycle tests/openapi tests/sse`:
  79 passed, 0 failed. `tsc --noEmit`: zero errors under `src/`.
- Full `bun run verify` (strict starter/browser flags) in a clean clone of
  the revised branch, plus the re-run package rehearsal binding to the
  final candidate commit: recorded in the follow-up docs commit.

## Boundaries and working tree

Known limitation carried into the fix: `raceDeadline` stops *waiting*, it
does not terminate the underlying initializer/disposer — the process
supervisor remains the final boundary (documented in `docs/services.md`).
Async `~standard.jsonSchema` converters (not produced by the pinned zod)
degrade to presence-only documentation rather than making document
generation async — a vendor-specific follow-up if one matters. P0-05's
validator-vs-encoding semantics awaits an owner ADR. No publication,
attestation, or push.
