---
type: Owner Decision Record
title: 'ODR-0005: M7-004 Dispatch — Application Service Lifecycle'
status: accepted
tags:
- owner-decision
- m7
- lifecycle
---

# ODR-0005: M7-004 Dispatch — Application Service Lifecycle

## Context

With M7-001 (assets, PR #335), M7-002 (hardening, PR #334), and M7-005
(browser artifact, PR #339) landed with complete evidence, the owner directed
continuation of the recommended sequence (2026-09-08): dispatch M7-004 next,
leaving M7-003 separately gated. This record captures that dispatch per
[ODR-0003](colorjoy-adr-approvals.md) ("lifecycle proceeds once its gate is
recorded").

## Decision

1. **M7-004 is dispatched** for implementation under its accepted contract:
   [ADR-0020](../okf/decisions/0020-application-service-lifecycle.md) and the
   M7-004 issue record
   (`docs/okf/issues/m7/M7-004-add-application-service-lifecycle-with-drain-ordered-shutdown.md`).
2. **Serving signature authority:** ADR-0020 requires initialization to run
   in declaration order **before the server accepts traffic**. Implementation
   may make `app.serve()` asynchronous for that purpose; the change requires
   a migration note in the API reference and the evidence report, must keep
   `createTestServer` ergonomic, and is revertible as one task. No other
   public API reshaping is authorized by this record.
3. **Boundaries carried unchanged from ADR-0020 / ODR-0003:**
   - Unsuccessful (deadline-expired) shutdown never disposes resources that
     continuing work may still use; no fabricated success.
   - Connection closure, tracked-work completion, and disposal completion are
     reported as three distinct outcomes.
   - The guarantee covers tracked work only; detached work remains the
     application's responsibility. No implicit process exit; no task
     orchestration system.
   - Signals (SIGINT/SIGTERM) are opt-in; importing Lugas installs nothing.
   - Per-request hook families remain out of scope (ADR-0007 boundary).
4. **Not dispatched by this record:** M7-003 (body budgets) remains blocked on
   the owner's explicit go. The attested beta.1 artifacts and publication hold
   remain untouched.

## Effect

- The M7-004 worktree may be created from a green base containing this record.
- M7-GATE membership is unchanged: M7-004 remains a declared dependency of the
  gate until its evidence is complete.
