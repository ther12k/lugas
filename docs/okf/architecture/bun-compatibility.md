---
type: Compatibility Specification
title: Bun Version and Native Semantics Compatibility
status: draft
tags:
- bun
- compatibility
- versions
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Bun Version and Native Semantics Compatibility

## Baseline

The design baseline is Bun 1.4.x. M0 pins an exact patch for reproducibility and CI also tests the latest compatible 1.4 patch before beta.

## Native semantics to characterize

M0-006 must record, with executable fixtures:

- exact route precedence;
- parameter decoding and malformed encoding behavior;
- wildcard and catch-all behavior;
- per-method route maps;
- `HEAD`, `OPTIONS`, and method-not-allowed behavior;
- static `Response` reuse and headers;
- Bun file and directory routes;
- fallback `fetch` behavior;
- server `error` behavior;
- request params and cookie APIs;
- `server.fetch`, ephemeral ports, stop, and reload behavior;
- body-size limits and aborted requests;
- platform differences across Linux, macOS, and Windows.

## Compatibility promise

Before beta, Lugas supports only versions present in the published compatibility matrix. “Works on Bun” is not enough; exact minor/patch evidence is required.

## Upgrade process

1. Open a compatibility issue for the target Bun release.
2. Run raw Bun characterization first.
3. Run Lugas conformance and benchmark suites unchanged.
4. Classify changed behavior as Bun change, Lugas defect, or intentional adoption.
5. Update the matrix and changelog.
6. Add an ADR only for consequential behavior or support-policy changes.

## No compatibility emulation

Lugas does not emulate older Bun routing semantics. If a supported Bun patch has a framework-breaking defect, pin or drop that patch with evidence rather than inserting a second router.
