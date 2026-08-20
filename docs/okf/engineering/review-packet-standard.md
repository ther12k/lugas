---
type: Engineering Standard
title: Issue, Gate, and Release Review Packet Standard
status: draft
tags:
- review
- evidence
- release
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Issue, Gate, and Release Review Packet Standard

## Per-issue evidence

Every implementation/spike issue reports:

```text
Issue and source commit
Outcome
Files changed
Public API impact
Assumptions
Implementation notes
Acceptance mapping
Commands run and exact result
Tests added
Type/runtime/bundle impact
Security considerations
Known limitations
Deferred work
Dependency impact
Clean working-tree status
```

Use [Issue Evidence Template](../templates/issue-evidence-template.md).

## Gate packet

A milestone gate includes:

- required issue list and merged commit links;
- acceptance criterion → evidence/test mapping;
- unresolved defects by severity;
- API and ADR changes;
- compatibility matrix;
- benchmark/type/security evidence appropriate to milestone;
- clean checkout reproduction result;
- explicit go/no-go verdict;
- correction issue IDs for every failure.

A gate may not mark an unexecuted check as passed.

## Release packet

Alpha/beta release packets additionally include:

- source archive/package tarball names and SHA-256;
- release commit and tag candidate;
- package file inventory;
- dependency/license/SBOM reports;
- build provenance;
- Bun/OS/type compatibility matrix;
- security review;
- benchmark methodology/raw summaries;
- known limitations and migration notes;
- owner approvals.

## Independent review

The gate reviewer should reproduce from a clean checkout and avoid relying solely on child issue summaries. A polished report cannot substitute for failing commands or missing raw evidence.
