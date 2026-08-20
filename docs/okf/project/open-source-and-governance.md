---
type: Open Source Strategy
title: Open Source, Ownership, and Governance Plan
status: draft
tags:
- open-source
- governance
- license
- ownership
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Open Source, Ownership, and Governance Plan

## Current state

LugasJS is a design and implementation plan. This bundle does not create a public project, grant trademark rights, select a license, or promise a release date.

## Recommended initial governance

- One accountable owner for product scope and release decisions.
- A small maintainer group for core reviews after the first beta.
- ADRs for public API, compatibility, dependency, and runtime changes.
- GitHub issues for executable work and discussions/RFCs for exploratory proposals.
- Security reports through a private channel once a public repository exists.
- A code of conduct and contribution guide before external contributions are solicited.

## License decision criteria

The owner should compare MIT, Apache-2.0, and another preferred permissive option for:

- patent grant expectations;
- compatibility with Bun, TypeScript, Standard Schema, and copied snippets;
- contributor familiarity;
- corporate adoption requirements;
- trademark separation;
- notice and attribution burden.

Agents may prepare the comparison but may not choose or attach the final license without owner approval.

## API change governance

- `0.x` may change, but every breaking change requires a changelog entry and migration note.
- Beta public API changes require an ADR and at least one release of deprecation where practical.
- Diagnostic codes, manifest schema, client result shape, and response helpers are treated as public contracts.
- Internal directory paths and private types are not public merely because they exist in the package tarball.

## Ecosystem rule

Do not create an official plugin marketplace or bless integrations before the core boundary is stable. Community examples may use ordinary functions and modules. A feature belongs in core only when almost every Lugas application needs it and native Bun/application code cannot express it clearly.
