---
type: Roadmap
title: Evidence-Gated LugasJS Roadmap
status: draft
tags:
- roadmap
- milestones
- evidence
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Evidence-Gated LugasJS Roadmap

```text
M0 design/tooling/Bun oracle
  → M1 native kernel
  → M2 validation and guards
  → M3 typed contract and client
  → M4 manifest/testing/CLI/agent docs
  → M5 hardening and private alpha
  → M6 beta stabilization and owner release decision
```

## Sequencing rationale

### M0 — Prove before building

Freeze the source baseline, characterize Bun rather than guessing, choose a viable TypeScript encoding, and install subagent/CI/evidence mechanics. This prevents parallel agents from implementing incompatible interpretations.

### M1 — Smallest useful kernel

Implement native route composition, typed native responses, services, modules, collision diagnostics, secure fallback/error behavior, and package boundaries. No validation or client yet.

### M2 — Input and policy correctness

Add optional Standard Schema parsing/validation, deterministic query/header/body policies, named ordered guards, context enrichment, and adversarial tests. These outcomes must be stable before client types encode them.

### M3 — End-to-end types

Extract the compile-time app contract and implement an explicit browser-safe client. Type-system performance is a gate, not an afterthought.

### M4 — Operability

Add a truthful runtime manifest, stable diagnostics, real test-server helpers, safe CLI inspection, canonical examples, and generated agent documentation.

### M5 — Technical alpha proof

Measure runtime/startup/memory/type/package cost, close security and compatibility, stress concurrency/cancellation/large routes, and build a production-shaped proof API. Produce a private alpha packet without publishing.

### M6 — Beta decision

Freeze public API, complete migration/adoption docs, rehearse packaging/provenance, resolve owner decisions, run clean-room agent validation, rerun evidence on the exact commit, and assemble the beta packet. Publication is a separate owner-authorized action.

## Parallelism policy

Tasks in the same local wave are candidates for parallel subagents only when:

- all dependencies are merged;
- conflict groups and owned files do not overlap;
- shared-file integration is assigned to one task;
- the preceding milestone gate has passed;
- no owner decision blocks the task.

See [Parallel Execution Waves](parallel-execution-waves.md) and [Subagent Worktree Protocol](../engineering/subagent-worktree-protocol.md).

## Stop rule

A failed gate blocks downstream dispatch. Open correction issues with explicit dependencies; do not mark the gate passed “with known issues” unless an owner-approved, time-bounded waiver is documented and the release policy permits it.
