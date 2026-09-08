---
type: Owner Decision Record
title: 'ODR-0004: M7-005 Dispatch — Browser-Executable Client Artifact'
status: accepted
tags:
- owner-decision
- m7
- packaging
- client
---

# ODR-0004: M7-005 Dispatch — Browser-Executable Client Artifact

## Context

After the M7-001 asset work landed (merged PR #335) and the documentation
reconciliation landed (merged PR #336), the owner asked for a framework
review and a recommended next task (2026-09-08). The review recommended
dispatching M7-005 (browser-executable client artifact, ADR-0021) as the
highest-value next step, followed by recording the dispatch gate. The owner
directed continuation of that sequence, which this record captures as the
M7-005 dispatch gate required by [ODR-0003](colorjoy-adr-approvals.md)
("browser packaging proceeds once its gate is recorded").

## Decision

1. **M7-005 is dispatched** for implementation under its accepted contract:
   [ADR-0021](../okf/decisions/0021-prebuilt-browser-client-artifact.md) and
   the M7-005 issue record (`docs/okf/issues/m7/M7-005-ship-browser-ready-client-javascript.md`).
2. **Artifact specifier authority:** per ADR-0021 §2, the exact browser
   export specifier is decided at implementation within the approved scope.
   The implementation selects the minimal subpath addition to the existing
   export map (no general export rewrite); the choice and its rationale are
   recorded in the M7-005 evidence report and are revertible as one task.
3. **Boundaries carried unchanged from ADR-0021 / ODR-0003:**
   - `.ts` sources remain the only type source of truth; no `.d.ts` fork.
   - Two distinct browser evidence stages; stage one does not close stage two.
   - Stage-two acceptance requires a real browser executing the **installed
     release artifact** from an unrelated temporary install with the source
     checkout out of the resolution path.
   - Same-origin scope only; no CORS or broad browser-matrix claims.
   - The protected `package.json` export change and release-pipeline wiring
     stay owned by this single issue.
   - README/compatibility browser-CI wording may be updated only after the
     artifact lane has actually executed and its evidence is recorded.
4. **Not dispatched by this record:** M7-003 (body budgets) remains
   separately gated on the owner's explicit go; M7-004 (lifecycle) is not
   dispatched here; the attested beta.1 artifacts and publication hold remain
   untouched.

## Effect

- The M7-005 worktree may be created from a green base containing this record.
- M7-GATE membership is unchanged: M7-005 remains a declared dependency of
  the gate until its evidence is complete.
