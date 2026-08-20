---
type: Engineering Standard
title: Continuous Integration and Quality Gates
status: draft
tags:
- ci
- quality
- gates
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Continuous Integration and Quality Gates

## One verification entry point

The repository provides one documented command, proposed as:

```bash
bun run verify
```

It orchestrates deterministic checks without hiding individual commands.

## Required CI jobs

### Fast pull-request jobs

- formatting/lint;
- strict typecheck;
- unit tests;
- type contract tests;
- OKF/frontmatter/link/dependency validation;
- package export/import smoke tests;
- issue evidence presence for implementation PRs.

### Integration jobs

- Bun server integration tests;
- raw Bun/Lugas conformance;
- browser-safe client build;
- package tarball dry run;
- platform matrix when relevant.

### Scheduled/release jobs

- controlled benchmarks;
- 1,000/10,000 route stress;
- dependency/license/vulnerability audit;
- security stress/fuzz subset;
- clean-room documentation exercise;
- release packet and checksum verification.

## Merge rules

- Required jobs must pass on the final commit.
- A gate issue cannot close with red CI or missing child evidence.
- Flaky tests are defects; retries may collect evidence but not redefine passing.
- Benchmark alerts require review; they are not silently ignored.
- Dependency upgrades use dedicated issues and lockfile ownership.

## Branch protection recommendation

- pull request required;
- at least one independent review for core public API;
- code owners for exports, compiler, validation, client types, CI, and security-sensitive files;
- linear history or squash policy chosen consistently;
- force push restricted on protected branches;
- release tags owner-controlled.
