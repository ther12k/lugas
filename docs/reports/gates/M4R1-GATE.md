---
type: Gate Review Packet
title: M4R1 Gate — Runtime Truth Closure
status: passed
tags:
- gate
- m4r1
- runtime-truth
- manifest
---

# M4R1 Gate Review Packet

Verdict: **GO**. The M4R1 revision wave closed all route-truth divergences identified in the independent review of `main@391ef79`. M4-009 (golden lock) is **RESUMED** — the goldens it produced are consistent with the corrected generator.

## Required issues and merged commits

| Issue | PR | Summary |
|---|---|---|
| M4R1-001 Build immutable canonical PreparedApp route graph | #205 | Single-interpreter route fact capture |
| M4R1-002 Merge per-path method maps + close wildcard/collision | #208 | Wildcard semantics unified |
| M4R1-003 Repair validated guard context and enrichment invariants | #206 | Guard context matches pipeline output |
| M4R1-004 Restore Bun-native function routes and handler conformance | #209 | Function routes restored; sync fast path preserved |
| M4R1-005 Infer server handler and ordered guard context types | #213 | Schema outputs + guard enrichments typed on handler |
| M4R1-006 Enforce required typed-client input and HTTP edge cases | #207 | Client input slot enforcement |
| M4R1-007 Preserve sync error boundary and harden redaction | #210 | Sync error boundary; redaction hardened |
| M4R1-008 Generate manifest from prepared facts + ADR-0017 | #211 | Manifest v1 schema amended; method representation corrected |
| M4R1-009 Cross-component conformance suite | #214 | 19 black-box probes through public API |

## Clean-checkout reproduction

```text
bun run versions
# bun 1.4.0; tsc Version 7.0.2

bun run typecheck
# pass

bun test
# 482 pass, 1 skip (documented Bun leak characterization), 0 fail across 82 files

bun run verify:docs
# verify:docs passed: 0 error(s), 0 warning(s)

bun run verify
# PASS typecheck / tests / docs / diff — full green

bun test tests/conformance/
# 19 pass, 0 fail (all must-pass probes green)
```

## Must-pass probe matrix (M4R1-009 reproduced on integration base)

All 18 must-pass probes from the issue scope verified green via public API against live `app.serve()`. See `tests/conformance/cross-component.test.ts` and `tests/conformance/validation-guards.test.ts` for executable evidence.

## Evidence completeness review

Every M4R1 evidence report contains: baseline commit, outcome, files changed, assumptions, acceptance mapping with per-criterion results, exact commands/results, security considerations, known limitations, deferred work, dependency notes, and working-tree state. No weakened tests, no unapproved API expansion, no out-of-scope cleanup identified.

## API changes introduced by M4R1

- `RouteContext` derived type replaces manual TContext for handler typing.
- `PreparedApp` internal type introduced as single-interpreter route graph.
- `FRAMEWORK_VERSION` build constant replaces filesystem reads.
- ADR-0017 amends manifest v1: `"*"` method representation, bare descriptor visibility, preparation-time provenance.

## Compatibility

No breaking changes to existing consumers: all prior suites pass unchanged (except one legacy test-d assertion loosened to match the new derived context default, recorded in M4R1-005 evidence).

## Go/no-go

**GO** — resume M4-009 and unblock M4-010/011. No correction issues required.
