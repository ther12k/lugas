---
type: Engineering Specification
title: Repository Layout and Ownership Boundaries
status: draft
tags:
- repository
- layout
- ownership
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Repository Layout and Ownership Boundaries

## Target layout

```text
.
├─ src/
│  ├─ index.ts
│  ├─ core/
│  ├─ internal/
│  ├─ client/
│  ├─ testing/
│  └─ cli/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ conformance/
│  ├─ types/
│  └─ fixtures/
├─ examples/
├─ benchmarks/
├─ docs/
│  ├─ okf/
│  └─ reports/issues/
├─ scripts/
├─ .github/
├─ package.json
├─ bun.lock
└─ tsconfig.json
```

## Public versus internal

- `src/index.ts`, `src/client/index.ts`, and `src/testing/index.ts` are explicit export surfaces.
- `src/internal/**` is never exported.
- Public types should be declared near the public concept but may rely on private helpers.
- Tests may import internals only from a designated test-only path or through relative repository paths; package consumers cannot.

## Worktree ownership zones

| Zone | Typical owner |
|---|---|
| `src/core/response*` | response task |
| `src/core/route*` | route descriptor task |
| `src/core/guard*` | guard task |
| `src/internal/compile*` | route compiler/integration task |
| `src/internal/validation*` | validation tasks |
| `src/client/**` | client milestone tasks |
| `src/testing/**` | testing milestone tasks |
| `src/cli/**` | CLI tasks |
| `src/*/index.ts`, `package.json`, lockfile | dedicated export/package integrator |
| `.github/workflows/**` | CI task |
| central OKF backlog/index | documentation integrator or gate task only |

## Rules

- Do not create empty directories or placeholder modules solely to match the target tree.
- New public files require a source issue and export owner.
- Generated reports and benchmark raw data must not be imported by runtime code.
- Worktrees, build output, coverage, flamegraphs, heap snapshots, and local secrets are ignored.
- Example code should depend on the package public API, not internal paths.
