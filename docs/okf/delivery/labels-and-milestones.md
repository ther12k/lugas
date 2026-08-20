---
type: Operations Plan
title: GitHub Labels, Milestones, and Severity
status: draft
tags:
- labels
- milestones
- severity
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# GitHub Labels, Milestones, and Severity

## Milestones

- `M0 — Design Freeze and Baselines`
- `M1 — Bun-Native Kernel`
- `M2 — Validation and Guards`
- `M3 — Typed Contract and Client`
- `M4 — Manifest, Tooling, and Agent DX`
- `M5 — Hardening and Private Alpha`
- `M6 — Beta Stabilization and Release`

## Required label families

- Type: implementation, spike, test, docs, integration, gate, security, benchmark, release.
- Area: architecture, core, routing, responses, validation, guards, types, client, manifest, testing, cli, docs, ci, security, performance, packaging, release.
- Priority: P0, P1, P2.
- Size: S, M, L.
- State: agent-ready, blocked, needs-design, worktree-active, correction, owner-decision.

## Severity versus priority

Security/correctness finding severity:

- **P0/Critical:** data exposure, auth bypass, remote crash/compromise, corrupt release artifact, or fundamental contract unsoundness. Stop affected milestone.
- **P1/High:** common correctness/security failure, severe compatibility/performance/type regression, or release-blocking package defect.
- **P2/Medium:** bounded defect with workaround or non-core platform gap.
- **P3/Low:** polish, documentation clarity, or future enhancement.

Priority on planned tasks expresses sequencing, not discovered vulnerability severity. Triage records both when necessary.
