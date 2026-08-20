---
type: Review Checklist
title: LugasJS Code Review Checklist
status: draft
tags:
- review
- checklist
- github
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS Code Review Checklist

## Contract

- [ ] Change matches the assigned issue and accepted ADRs.
- [ ] No second route representation, hidden scope, or custom router was introduced.
- [ ] Native Bun objects and escape hatches remain available.
- [ ] Compile-time and runtime metadata are not conflated.
- [ ] Public type hovers and failure messages are readable.

## Correctness

- [ ] Positive and negative tests cover acceptance.
- [ ] Unused parsing/async work is absent.
- [ ] Guard order/short-circuit and handler non-execution are proven where relevant.
- [ ] Abort, malformed input, and cleanup paths are considered.

## Security

- [ ] No secret/request-body leakage.
- [ ] No unsafe path/query concatenation.
- [ ] Limits and hostile collections are bounded.
- [ ] Dependency/license impact is recorded.

## Performance/types

- [ ] Hot path does not add avoidable allocation or promise plumbing.
- [ ] Type-performance fixture updated when contract types change.
- [ ] Bundle/export boundaries remain clean.

## Delivery

- [ ] Owned-file boundary respected.
- [ ] Evidence is exact and reproducible.
- [ ] Shared exports/config changed only by authorized issue.
- [ ] Deferred work has an issue or explicit rejection.
