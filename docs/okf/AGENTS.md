---
type: Agent Operating Standard
title: LugasJS Repository Agent Instructions
status: draft
tags:
- agents
- worktree
- governance
- engineering
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
description: Standing operating rules for human and AI contributors.
---

# LugasJS Repository Agent Instructions

These rules apply to every human or AI contributor unless the current owner instruction explicitly overrides them.

## Source precedence

When documents conflict, use this order:

1. Explicit owner instruction in the current task.
2. Accepted ADRs created after this bundle.
3. The issue assigned to the current worktree.
4. Existing ADRs in [`decisions/`](decisions/).
5. Architecture and engineering specifications.
6. Roadmap and backlog summaries.
7. References and historical design notes.

Never drift silently. A material contract change requires an ADR or a clearly labeled correction linked from the issue evidence.

## Non-negotiable architecture

1. Lugas is Bun-only through 0.x.
2. Bun's native router remains the request-path router. Do not add a custom router, route regex loop, or framework route lookup.
3. Public APIs remain small, explicit, object-based, and statically searchable.
4. Native `Request`, `Response`, `Headers`, `URL`, `FormData`, `ReadableStream`, `BunFile`, and `Bun.serve` options remain available.
5. Core must not absorb ORM, authentication product, OpenAPI, JSX, WebSocket abstraction, cloud adapter, or multi-runtime compatibility without an accepted ADR and authorized milestone.
6. Do not depend on Elysia or Eden. Learn from them; do not import their architecture by stealth.
7. Do not claim a performance win without the reproducible evidence required by the assigned issue.
8. Compile-time type facts and runtime manifest facts must remain distinct.
9. Package names, public repository creation, license, organization, domain, and release publication are owner decisions.

## One issue, one worktree

- Work only on the assigned issue and its stated prerequisites already merged into the base branch.
- Recommended branch: `agent/<ISSUE-ID>-<slug>`.
- Recommended worktree: `.worktrees/<ISSUE-ID>`.
- Do not modify files outside the issue's **Owned files** unless the issue explicitly allows it.
- Do not edit central status files to report progress. GitHub issue/PR state is the source of truth.
- Every implementation task creates `docs/reports/issues/<ISSUE-ID>.md` from the evidence template.
- Gate issues may aggregate reports but must not rewrite evidence from child tasks.

## Shared-file discipline

The following are integration hotspots and may be changed only by tasks that explicitly own them:

```text
package.json
bun.lock
src/index.ts
src/client/index.ts
src/testing/index.ts
tsconfig*.json
.github/workflows/*
docs/okf/delivery/backlog.md
docs/okf/delivery/issue-index.md
```

When another task needs a shared export, implement the internal module and document the pending export in evidence. The designated package/export task performs the shared edit later.

## Required workflow

1. Read the assigned issue, its source documents, and all dependency evidence.
2. Confirm the dependency commits exist in the base branch.
3. Inspect the current code before designing changes.
4. Record assumptions in the issue evidence before coding.
5. Implement the smallest complete solution within scope.
6. Add negative tests, not only happy-path tests.
7. Run every verification command in the issue.
8. Record exact commands and results, including unexecuted checks and blockers.
9. Review the diff for accidental public API expansion or out-of-scope cleanup.
10. Leave the worktree clean and submit an atomic PR linked to the issue.

## Prohibited shortcuts

- Do not weaken a test to make it pass.
- Do not replace a failing benchmark baseline with an easier one.
- Do not invent missing runtime metadata from TypeScript types.
- Do not add `any`, broad casts, or `@ts-ignore` at public boundaries without documented proof.
- Do not create a second route representation for convenience.
- Do not start later-milestone work because a nearby abstraction looks useful.
- Do not publish packages, create public repositories, reserve paid assets, or select a license without owner approval.

## Stop conditions

Stop and report a blocker only when:

- an unresolved owner decision is irreversible;
- a dependency contract is missing or contradictory;
- the requested work would violate the architecture constitution;
- required external credentials or infrastructure cannot be substituted locally;
- a security or licensing issue requires owner review.

Routine design choices should be resolved through the issue's acceptance criteria, a reversible spike, tests, or an ADR proposal—not by waiting for conversational clarification.
