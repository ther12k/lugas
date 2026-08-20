---
type: Architecture Decision Record
title: ADR-0012 — One Package with Subpath Exports
status: accepted
tags:
- adr
- architecture
- '0012'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0012 — One Package with Subpath Exports

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

Premature package fragmentation increases release, version-skew, and discovery cost. Client and testing still need strict runtime boundaries.

## Decision

Ship one package initially with server root, `./client`, and `./testing` subpath exports. CLI may share the package. Browser-safe exports must not import Bun-only runtime code.

## Consequences

- One version coordinates contracts.
- Subpath tests become a release gate.
- Optional code remains detachable through export boundaries.
- A scoped fallback may replace the unreserved package name.

## Alternatives considered

- Many `@lugas/*` packages: rejected before ecosystem maturity.
- Everything from root export: rejected because browser bundling could pull server code.
- Separate client package: deferred until independent release cadence is proven.

## Validation and revisit trigger

M1-018, M3-018, M4-017, and package dry-run evidence validate boundaries. Split only with measured independent ownership/versioning need.
