# Open Decision Register

Decisions that agents may research and prepare but never finalize autonomously (see [`docs/okf/delivery/owner-decisions.md`](okf/delivery/owner-decisions.md)). ADRs listed in [`docs/okf/decisions/`](okf/decisions/) are accepted as design; the entries below remain owner-blocked at the recorded status.

| ID | Decision | Blocking issue | Status | Notes |
|---|---|---|---|---|
| OD-001 | Package and repository identity (npm package/scope, GitHub org/repo, optional domain) | M6-004 | **Open — owner-blocked** | ADR-0001 fixes the product name *LugasJS* only; registry reservation is not authorized. The current private repository `ther12k/lugas` is a workspace, not the public identity. |
| OD-002 | License, notices, maintainers, contribution/release authority, security contact | M6-005 | **Open — owner-blocked** | No license is chosen; the repository is private and unlicensed until this decision. |
| OD-003 | Public beta publication and allowed claims | M6-GATE + separate publication action | **Open — owner-blocked** | Publication is irreversible; beta packet alone does not authorize release. |
| OD-004 | Public performance messaging | M5-GATE / M6-GATE review | **Open — deferred** | No measured performance claims exist before M5 evidence (ADR-0016). |
| OD-005 | Post-beta scope (OpenAPI, tree client, prefix helper, after hooks, WebSocket/SSE, codegen, multi-runtime) | new ADR + owner-authorized roadmap | **Open — out of scope** | Not implicitly approved by the design bundle. |

## Rule of use

- Implementation issues must not consume an open decision as if decided; they treat the design bundle's constraints as binding and stop at the boundary recorded here.
- When an owner decision is made, record it as an ADR linked from the corresponding blocking issue and update this register in the same change.
