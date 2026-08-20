---
type: Product Design Standard
title: AI-Friendly Framework and Repository Design
status: draft
tags:
- ai
- agents
- developer-experience
- documentation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# AI-Friendly Framework and Repository Design

AI-friendly design is a correctness discipline, not a marketing label.

## Framework characteristics

### Local route comprehension

A route's path, method, declared input, guards, and handler should be visible within one small source region. An agent should not need to reconstruct chained mutations from earlier files.

### Canonical syntax

Documentation and examples show one preferred way. Aliases, overloads, decorators, and fluent variants are avoided until a measured need exists.

### Named behavior

Modules, guards, operation IDs, diagnostics, and issue IDs use stable names. Anonymous closures remain acceptable for route handlers but not for reusable policy whose identity appears in manifests or errors.

### Explicit escape hatches

Native `Request`, `Response`, `RequestInit`, `fetch`, and Bun options remain accessible. Escape hatches are documented rather than disguised as unsupported hacks.

### Deterministic inspection

`app.manifest`, diagnostics, examples, and CLI output are stable and machine-readable. Output ordering must not depend on object hash iteration beyond JavaScript's defined property order; production code should sort where users compare artifacts.

## Repository characteristics

- One issue per worktree.
- Explicit dependency IDs and merge barriers.
- Owned-file lists and shared-file integration tasks.
- Stable verification commands.
- Evidence files that record commands, results, assumptions, and unresolved risk.
- Small issue scope with a clear stop point.
- No progress reporting through edits to central Markdown tables.

## Documentation set

The implementation repository should ship:

```text
README.md
AGENTS.md
llms.txt
llms-full.txt
skills/lugas/SKILL.md
docs/concepts/*.md
examples/*
```

The agent references must be generated or verified against the same canonical route/API descriptions as human documentation.

## Clean-room test

Before beta, assign an independent agent that has:

- the repository;
- this documentation;
- one realistic issue;
- no hidden conversation history.

Measure whether it can locate the correct files, avoid forbidden abstractions, implement the task, run verification, and produce valid evidence. Failures must improve the framework or documentation, not merely the prompt.

## Anti-patterns

- “Magic” described only by prose and not represented in types or manifests.
- Error messages without stable codes.
- One generic middleware API whose return semantics vary by undocumented convention.
- Route paths assembled from many hidden prefixes.
- Runtime metadata inferred from erased compile-time types.
- Issue descriptions that say “implement X” without non-goals, verification, or file ownership.
