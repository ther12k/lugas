---
type: Risk Register
title: LugasJS Risks and Open Questions
status: draft
tags:
- risks
- open-questions
- mitigation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS Risks and Open Questions

| ID | Risk/open question | Likelihood | Impact | Mitigation / deciding issues |
|---|---|---:|---:|---|
| R-001 | TypeScript cannot infer services/guard context cleanly across module files without awkward syntax. | medium | high | M0-009 chooses one measured encoding; M1/M2 type gates. |
| R-002 | End-to-end response unions cause editor/compiler slowdown at 500+ routes. | medium | high | M3-005/M3-017; explicit fetch paths; generated-client fallback only with evidence. |
| R-003 | A “thin” wrapper is slower than expected due to context allocation, async plumbing, or validation composition. | medium | high | M1-010, M2-014, M5-002/M5-003; specialize only after evidence. |
| R-004 | Bun route semantics differ by patch/platform. | medium | high | M0-006 oracle, M5-010 matrix, M6-006 support declaration. |
| R-005 | Native route value classification relies on unstable Bun types/forms. | medium | medium | M1-008 against exact pinned version; fail closed on unknown values. |
| R-006 | Standard Schema libraries expose divergent issue/async behavior. | medium | medium | M2-001/M2-002 multi-library conformance and bounded normalization. |
| R-007 | Body validation before auth wastes work or increases attack cost. | medium | medium | Bun body limits, simple lifecycle, M2-015/M5-013; reconsider pre-parse guard only by ADR. |
| R-008 | Runtime manifest is mistaken for full API schema/OpenAPI. | high | medium | ADR-0014, M4-001/M4-003, docs and clean-room review. |
| R-009 | CLI app import executes project side effects or hangs. | high | high | M4-010 spike may reject direct import; M4-012 subprocess safety. |
| R-010 | Package/client subpaths accidentally import Bun server code. | medium | high | M3-014, M3-018, M4-017, package graph gates. |
| R-011 | Worktree agents conflict through exports, lockfile, CI, or central docs. | high | medium | Dedicated integrators, conflict groups, M0-011, no central progress edits. |
| R-012 | Agents expand scope toward Elysia compatibility or a plugin ecosystem. | medium | high | AGENTS, ADRs, issue non-goals, M5-015 deletion review. |
| R-013 | Benchmark comparisons become unfair or overmarketed. | medium | high | M5-001 methodology, feature equivalence, ADR-0016, gate review. |
| R-014 | Package/repository name is unavailable or conflicts legally. | unknown | medium | M6-004 owner decision; scoped fallback. |
| R-015 | Final license/third-party attribution is unresolved. | low-medium | high | M5-009 audit and M6-005 owner decision. |
| R-016 | Zero runtime dependency target conflicts with Standard Schema typing/tooling. | low-medium | medium | M2-001 evidence and ADR amendment if necessary. |
| R-017 | Raw Response escape hatch makes client contract imprecise. | high | low-medium | Conservative widening; document; typed helpers canonical. |
| R-018 | Full paths feel repetitive and users demand prefix groups. | medium | low | Measure real usage/agent search; no hidden prefix before post-beta ADR. |
| R-019 | Lack of after hooks makes some logging/cleanup patterns awkward. | medium | medium | Ordinary wrapper functions/application handling; revisit with streaming/cancellation proof. |
| R-020 | Bun 1.4/Elysia 2 are recent and may change quickly. | high | medium | Exact pins, current verification, compatibility issues, no broad promises. |

## Open owner questions

- Exact npm package/scope and GitHub organization/repository.
- Final open-source license and governance roles.
- Public beta publication timing and claims.
- Website/domain and trademark investment.

## Open technical questions closed by spikes

- M0-009: canonical services/module/guard generic encoding.
- M4-010: safe CLI application import contract.
- M3-017: whether type-only client remains viable at target scale.
- M5-004/M5-014: practical large-route startup/runtime limit.
