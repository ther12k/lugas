---
type: Engineering Standard
title: LugasJS Evidence Model
status: draft
tags:
- evidence
- reports
- verification
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS Evidence Model

## Evidence classes

| Class | Location | Purpose |
|---|---|---|
| Task evidence | `docs/reports/issues/<ID>.md` | Bind one issue's acceptance criteria to code, tests, commands, and commit |
| Gate evidence | `docs/reports/gates/<MILESTONE>-GATE.md` | Independently verify all required child evidence and milestone exit criteria |
| Raw evidence | `benchmarks/raw/**`, test reports, profiler output | Preserve machine-readable observations without editorial rewriting |
| Decision evidence | ADRs, spike reports, owner decision record | Explain why consequential or irreversible choices were made |
| Release evidence | release packet and checksums | Bind release claims to an exact commit and artifact |

## Evidence rules

- A command that was not executed is **unexecuted**, never passed.
- A target or budget is not an observed result.
- Every result records tool versions, OS/architecture, commit, configuration, and exact command.
- Raw benchmark output is retained; Markdown reports summarize rather than replace it.
- Tests map to acceptance criteria and include meaningful negative cases.
- Failures, limitations, and unsupported environments remain visible.
- Gate reviewers reproduce critical checks from a clean checkout.
- Evidence files are additive history; status tracking belongs in GitHub rather than rewriting generated issue specs.

## Minimum per-issue fields

Baseline commit, issue ID, dependency commits, files changed, acceptance mapping, test/benchmark commands and results, type/runtime/package impact, security analysis, limitations, final commit, and clean-worktree confirmation.
