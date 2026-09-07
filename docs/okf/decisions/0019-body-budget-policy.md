---
type: Architecture Decision Record
title: ADR-0019 — Application-Default and Route-Specific Body Budgets
status: accepted
tags:
- adr
- architecture
- security
- body-limits
- '0019'
generated:
  by: zcode/glm
  at: '2026-09-07T00:00:00+07:00'
---

# ADR-0019 — Application-Default and Route-Specific Body Budgets

## Status

Accepted by owner decision (ODR-0003, `docs/owner-decisions/colorjoy-adr-approvals.md`, 2026-09-07) **after the directed amendment pass**: the default-selection fallback chain and the raw-stream enforcement contract above make the unset/default behavior and raw-stream guarantees explicit; with those points recorded, the owner stated no remaining architectural objection. Implementation is a **separately gated implementation task** (M7-003) — the amendment is not authorization to introduce this API through the M7-002 hardening issue, which remains existing-behavior work under normal rules.

## Problem

Server-wide body protection is an existing capability, not a missing feature: `docs/body-limits.md` delegates ceilings to `Bun.serve({ maxRequestBodySize })`, the option already passes through `app.serve()`, `tests/security/body-limits.test.ts` proves fail-closed enforcement, and pinned-runtime probing (Bun 1.4.0, Linux x86-64, 2026-09-06) fixed the wire contract — an oversized body is rejected by Bun during stream consumption with a bare `413` and an empty body, bypassing Lugas's Problem Details envelope. That existing behavior is being hardened and documented precisely by a separate issue (deterministic regressions for oversized, streamed-without-`Content-Length`, and exact-boundary fixtures; proof that rejected requests cannot mutate application state; per-fixture status expectations rather than mechanical assertion replacement).

The missing capability is **route-level policy**. An application with one large-upload endpoint must currently raise the server-wide ceiling or split servers; there is no application default and no per-route budget.

## Decision

Budget selection has an explicit fallback chain, with Bun remaining the only transport enforcement mechanism:

```text
selectedBudget  = routeOverride ?? applicationDefault ?? serverCeiling
effectiveBudget = min(serverCeiling, selectedBudget)
```

- **`serverCeiling` means the effective Bun ceiling** — including Bun's runtime default when the application does not supply `maxRequestBodySize`. Bun's public option is a numeric maximum measured in bytes.
- A route override may relax the application default; it may **never** relax the server ceiling — the `min` describes the outer bound.
- **Compatibility rule:** when neither a route budget nor an application default is configured, existing server-ceiling behavior is preserved exactly.
- **Configuration above the ceiling is rejected at startup.** An explicitly configured application or route budget above the server ceiling is a configuration error, not a silently accepted override that cannot take effect; startup validation keeps the public configuration understandable.

The guarantee is stated separately for the two body classes:

1. **Framework-parsed bodies** (routes declaring a body schema): the effective budget is enforced during bounded consumption, before parsing and handler execution. A rejected request never reaches validation or handler code.
2. **Raw/streaming bodies** (routes without a declared schema): for a **supported** raw-stream route, the framework counts bytes consumed through the budgeted body interface and **stops further budgeted reads on overflow**. The handler may already have started, and earlier application side effects are not rolled back. The response limitation follows directly: a handler that has already committed a response cannot also be promised a replacement Problem Details response when later consumption exceeds the budget. The server ceiling additionally bounds consumption at the transport layer (probed: bare `413`, empty body). A **narrower initial implementation is permitted**: reject route-budget configuration for raw-body consumption paths that the budgeted interface does not support. What is **not acceptable** in either form is a configured budget that appears active but does nothing for that handler.

Acceptance must include a Lugas-level rejection exercised with a threshold below Bun's threshold, so the framework's response path is observed independently of the transport rejection.

## Consequences

- Positive: per-endpoint budgets become expressible; enforcement ordering is structurally correct for framework-parsed bodies without new stream machinery.
- Positive: the guarantee split (framework-parsed vs raw streams) is explicit, so no consumer mistakes the server ceiling for a per-route pre-handler guarantee on raw streams.
- Cost/tradeoff: post-freeze public API growth (owner-gated) with a migration note.
- Compatibility effect: the transport rejection remains a bare `413` outside the Lugas error envelope — documented as observed and pinned transport behavior, not a Lugas-generated response.

## Alternatives considered

- A Lugas-owned counting guard over body streams: rejected — duplicates Bun's enforcement and creates double-enforcement ordering hazards.
- A payload guard after `request.json()`/schema parsing: rejected — enforcement after unrestricted parsing does not bound consumption.
- `Content-Length` pre-checks only: rejected — requests without a declared length bypass header checks; byte-counted enforcement is the sound boundary.
- Status quo (server ceiling only): rejected — real deployments need per-endpoint budgets without raising the global ceiling.

## Evidence

`tests/security/body-limits.test.ts` (fail-closed ceiling, no payload reflection; per-fixture status tightening happens in the hardening issue). Pinned-runtime probe, Bun 1.4.0, Linux x86-64 (2026-09-06): 32-byte ceiling with a 500-byte body → `413`, empty body, in production mode. `docs/reports/m5-cancellation.md` records the abort/partial-body boundary that composes with these limits. The implementing issue adds the below-threshold dual-rejection evidence.

## Revisit trigger

Bun changes the wire shape or enforcement point of body-size rejections within the supported 1.4.x line; or a production deployment demonstrates that a single server ceiling plus the defined budget formula cannot express a real topology.
