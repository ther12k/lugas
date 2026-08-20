---
type: Release Plan
title: Milestone and Release Gates
status: draft
tags:
- gates
- release
- acceptance
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Milestone and Release Gates

## Gate authority

A gate is an issue with a required independent review packet. The next milestone may not begin merely because most child issues are done.

## M0 gate

- Design baseline and ADR/open decisions recorded.
- Exact toolchain and CI reproducible.
- Bun route/server oracle complete.
- Type encoding selected with evidence.
- Security fixtures and worktree protocol ready.

## M1 gate

- Native kernel/package works from clean consumer.
- No custom router or hidden module scope.
- Typed native responses and secure errors pass.
- Sync fast path and native pass-through conformance pass.

## M2 gate

- Params/query/header/JSON validation semantics frozen.
- Standard Schema compatibility and issue normalization pass.
- Ordered guard context and response unions pass.
- Adversarial matrix has no open P0/P1.

## M3 gate

- Browser-safe explicit client works end to end.
- HTTP/transport/decode semantics frozen.
- 500-route type budget accepted; 1,000 route disclosed.
- Package subpath and consumer tests pass.

## M4 gate

- Manifest is truthful and deterministic.
- Diagnostics stable/redacted.
- Test server cleanup and CLI safety pass.
- Examples and generated agent docs are canonical.

## M5 private alpha gate

- Controlled performance/type/size evidence complete.
- Security, supply chain, compatibility, stress, and proof API pass.
- Zero open P0/P1.
- Private alpha packet verifies; no public publication.

## M6 beta gate

- Public API and compatibility frozen.
- Owner package/repository/license/governance decisions approved.
- Clean-room agent test passes.
- All evidence bound to exact release commit.
- Beta packet installs/verifies by checksum.
- Owner explicitly authorizes or rejects publication.

## Waivers

A waiver must name the failed criterion, severity, user impact, owner, expiry, correction issue, and why release remains safe. P0/P1 security/correctness findings are not waivable for beta under this plan.
