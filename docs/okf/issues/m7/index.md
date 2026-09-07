# M7 — ColorJoy Same-Origin Application Delivery

Tasks and gates: **6**. Decisions: ADR-0018, ADR-0019 (as amended), ADR-0020, ADR-0021 accepted individually per ODR-0003 (`docs/owner-decisions/colorjoy-adr-approvals.md`, outside this bundle).

- [M7-001 — Add opt-in native asset routes with explicit API ownership and safe misses](M7-001-add-opt-in-native-asset-routes-with-explicit-api-ownership-and-safe-misses.md) — wave 1, depends on M6-GATE
- [M7-002 — Pin delegated body-limit behavior and document transport-level rejection](M7-002-pin-delegated-body-limit-behavior-and-document-transport-level-rejection.md) — wave 1, depends on M6-GATE (hardening-only; no budget API)
- [M7-003 — Add application-default and route-specific body budgets](M7-003-add-application-default-and-route-specific-body-budgets.md) — wave 2, depends on M6-GATE, M7-002; **separately gated dispatch** (owner go required per ODR-0003)
- [M7-004 — Add application service lifecycle with drain-ordered shutdown](M7-004-add-application-service-lifecycle-with-drain-ordered-shutdown.md) — wave 2, depends on M6-GATE
- [M7-005 — Ship browser-ready client JavaScript](M7-005-ship-browser-ready-client-javascript.md) — wave 2, depends on M6-GATE; single owning issue for the protected export change
- [M7-GATE — Verify same-origin milestone evidence and approve release integration](M7-GATE-verify-same-origin-milestone-evidence-and-approve-release-integration.md) — wave 3, depends on M7-001 through M7-005

Scope note: this milestone establishes the tested same-origin browser workflow. CORS, OpenAPI/Scalar, Drizzle, SSE (gated on the M7-004 lifecycle evidence), and WebSocket/collaboration helpers are explicitly deferred.
