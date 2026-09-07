---
type: Owner Decision Record
title: 'ODR-0003: ColorJoy Same-Origin Milestone — ADR Approvals and M7 Boundaries'
status: accepted
tags:
- owner-decision
- adr
- m7
- assets
- body-limits
- lifecycle
- packaging
---

# ODR-0003: ColorJoy Same-Origin Milestone — ADR Approvals and M7 Boundaries

## Context

The owner reviewed the ColorJoy same-origin milestone proposals (ADR-0018 through ADR-0021 and the M7 issue drafts) against the summarized contracts, repository findings, and pinned-runtime probe record (Bun 1.4.0, Linux x86-64, 2026-09-06/07). This record captures the individual decisions and their boundaries. **Basis note:** the review was of the supplied summaries and probe evidence — not a file-level sign-off on the uncommitted drafts and not an independent rerun of `verify:docs`; file-level review continues through each implementation issue's evidence report.

## Decision

1. **ADR-0018 (opt-in public asset serving through the Bun adapter): approved as described.**
   - Boundary: explicit file mappings and directory mounts under explicit prefixes; public content only; no root catch-all; no SPA fallback in this initial scope.
   - The observed method policy is accepted (`{ GET: { dir } }` composition; asset mounts serve GET/HEAD; other methods reach the documented not-found outcome; **no 405 promise**). The integration must demonstrate the final response through Lugas's assembled routing configuration.
   - Both mapping forms obey the same method contract; tests assert the response, not only its status.
   - Platform containment evidence stays bounded: the Linux result (documented via `openat2(RESOLVE_IN_ROOT)`) is not a blanket cross-platform claim; per-platform tests are acceptance gates for claimed platforms.
   - The ENOENT finding stays classified as a development-mode diagnostics exposure of handwritten handlers. The probe record keeps the observed 21-byte production response; the regression asserts intended status and absence of seeded sensitive details, not Bun's exact error wording.

2. **ADR-0019 (application-default and route-specific body budgets): approved after the directed amendment.**
   - Amendment 1 — explicit fallback chain: `selectedBudget = routeOverride ?? applicationDefault ?? serverCeiling`; `effectiveBudget = min(serverCeiling, selectedBudget)`; `serverCeiling` is the effective Bun ceiling including the runtime default (numeric bytes). With no route budget and no application default configured, existing server-ceiling behavior is preserved. A configuration above the server ceiling is rejected at startup.
   - Amendment 2 — raw-stream contract: for a supported raw-stream route the framework counts bytes consumed through the budgeted body interface and stops further budgeted reads on overflow; the handler may already have started and earlier side effects are not rolled back; a handler that already committed a response cannot be promised a replacement Problem Details response. A narrower initial implementation (rejecting budget configuration on unsupported raw paths) is permitted; a budget that appears active but does nothing is not.
   - Implementation is a **separately gated task (M7-003)**. M7-002 stays hardening-only; no budget API may enter through it.

3. **ADR-0020 (application service lifecycle with drain-ordered shutdown): approved as described.**
   - Boundary: an unsuccessful shutdown must not become permission to dispose resources still in use. Deadline expiry with remaining tracked work reports an unsuccessful/incomplete outcome.
   - Connection closure, tracked-work completion, and disposal completion are reported as three distinct outcomes — not one "stopped" boolean.
   - The guarantee covers tracked work only; detached (unawaited, unregistered) work remains the application's or supervisor's responsibility. No implicit process exit; no general task-orchestration system.
   - SSE remains gated on this lifecycle's evidence.

4. **ADR-0021 (prebuilt browser-executable client artifact): approved as described.**
   - Boundary: this artifact and its necessary packaging changes only — not a general rewrite of package exports.
   - The two browser stages remain separate evidence: stage one (ordinary `fetch`) proves browser-to-server behavior; stage two proves the shipped artifact with real browser module resolution and the correct JavaScript MIME type.
   - Final acceptance anchor: the browser loads JavaScript from the installed release artifact, calls the application successfully, and handles the required error and cancellation cases without rebuilding client source or resolving anything from the source checkout.
   - Consumer type-checking stays independent; the plain-JavaScript demonstration must not require TypeScript configuration. Same-origin scope statement retained.

5. **M7-002 (existing body-limit hardening): proceed under normal repository rules**, hardening-only. No application-default or route-budget API may be added through this issue.

## Milestone declaration constraints

- Declaring M7 does **not** auto-accept any ADR; each decision above stands individually as recorded here.
- The validator change is mechanical: admit `m7` identifiers, preserve existing validation rules and M0–M6 behavior, and do not weaken bundle-link restrictions.
- During declaration, the plain-text evidence paths referenced from bundle files (a workaround for bundle-link restrictions) must be checked to exist; a green `verify:docs` alone does not establish their destinations.
- The already-attested `v0.1.0-beta.1` candidate and its evidence remain unchanged; new implementation bytes require their own applicable release evidence.

## Execution order

1. Record these decisions (this document) and complete the scoped M7 declaration.
2. Begin M7-001 (asset integration) and M7-002 (existing-limit hardening) in parallel — asset tests apply to the actual Lugas adapter composition; hardening reproduces and documents existing behavior.
3. Lifecycle (M7-004) and browser packaging (M7-005) proceed independently once their respective gates are recorded; the integrated no-build acceptance fixture joins the asset and browser-artifact work when both are ready.
