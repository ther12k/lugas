---
type: Engineering Standard
title: TypeScript Type-System Performance Strategy
status: draft
tags:
- typescript
- performance
- types
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# TypeScript Type-System Performance Strategy

## Why this is a release dimension

Lugas promises end-to-end types. Recursive path transformation, distributed unions, guard-context merging, and status unions can make editor/compiler performance worse long before runtime benchmarks notice.

## Fixtures

Generate deterministic applications with:

- 25 routes for normal small projects;
- 100 routes for medium services;
- 500 routes for the principal beta target;
- 1,000 routes for stress reporting;
- mixed static/param paths, methods, schemas, guards, raw responses, and typed responses.

## Measurements

Record:

- `tsc --extendedDiagnostics` wall time;
- memory used;
- type instantiations;
- assignability cache size where available;
- declaration emit time;
- editor-language-service scenario if automatable;
- hover readability snapshots for representative client calls.

Run cold and warm samples, pin TypeScript, and report machine details.

## Budget policy

- 500-route client/server typecheck must remain practical on ordinary development hardware.
- 1,000-route results are reported even if outside the main budget.
- No single feature may cause superlinear-looking growth without investigation.
- A regression greater than the accepted threshold blocks merge unless an ADR records the tradeoff.

## Design defenses

- Explicit path strings instead of Proxy tree types.
- Per-method/path lookup rather than transforming the whole contract for each call.
- Private helper types and shallow public hovers.
- Guard enrichment represented as ordered intersections with collision checks, not arbitrary recursive merge.
- Conservative raw-response fallback.
- Optional generated client considered only after evidence, not preemptively.

## Anti-cheating rules

Do not:

- use `skipLibCheck` to hide package declaration cost;
- measure a client that imports a simplified fake contract;
- remove response unions from the stress fixture;
- report only the fastest run;
- compare different TypeScript versions or hardware without disclosure.
