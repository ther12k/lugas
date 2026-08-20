---
type: Engineering Standard
title: Documentation, OKF, and Knowledge Lifecycle
status: draft
tags:
- documentation
- okf
- provenance
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Documentation, OKF, and Knowledge Lifecycle

## Format

The canonical design corpus uses Markdown concepts in an OKF v0.2-style bundle.

- Root `index.md` contains only the OKF version in frontmatter.
- Reserved directory `index.md` and `log.md` files have no concept frontmatter.
- Every other Markdown concept has parseable YAML frontmatter and non-empty `type`.
- Unknown frontmatter fields must survive tooling round trips.
- Internal relative links are validated more strictly than the base format requires.

## Status

Use `draft`, `proposed`, `accepted`, `superseded`, or `stable` consistently. Structural validation does not make a design accepted or implementation verified.

## Evidence lifecycle

- Design documents state proposed behavior.
- Issue evidence records implementation facts and commands.
- Gate reports aggregate merged evidence.
- ADR status changes only when the corresponding decision is approved and implemented where required.
- Performance targets remain targets until a dated report links raw results.

## Generated agent docs

`llms.txt`, full agent reference, and skill documents must be generated or checked against canonical API documents and examples. A release blocks when agent docs show stale syntax.

## Link and dependency validation

The validator checks:

- frontmatter parsing;
- required type;
- reserved-file rules;
- local links and anchors where practical;
- duplicate issue IDs;
- missing issue dependencies;
- dependency cycles;
- milestone ordering;
- issue index coverage;
- all ZIP members are Markdown for this design package.

## Provenance

References record source URL, retrieval date, and derived lesson. Do not paste large copyrighted source content. Preserve concise summaries and links.
