---
type: Engineering Standard
title: Compatibility, SemVer, and Deprecation Policy
status: draft
tags:
- versioning
- compatibility
- semver
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Compatibility, SemVer, and Deprecation Policy

## Versioning

Lugas follows semantic versioning once public packages exist. During `0.x`, minor versions may include breaking changes, but every change still requires explicit migration notes and evidence.

## Public contracts

Treat these as public:

- exported values and types;
- documented route/guard/helper semantics;
- client method and result shape;
- manifest format;
- diagnostic codes;
- package subpaths;
- supported Bun/TypeScript range;
- Problem Details extension fields.

Internal file paths and unexported symbols are not public.

## Compatibility matrix

Each release records:

- exact Bun versions tested;
- TypeScript versions used for declarations/type tests;
- supported operating systems;
- validator libraries/versions in conformance tests;
- browser/bundler matrix for `lugas/client`;
- known incompatibilities.

## Deprecation

Before beta, remove weak APIs rather than deprecate them. After beta:

1. mark deprecated in TSDoc/types;
2. document replacement and behavioral differences;
3. retain for at least one planned release where practical;
4. remove only in a breaking release;
5. keep diagnostic guidance during migration.

## Bun changes

A Bun patch may alter native semantics. Lugas does not conceal this. Compatibility updates state whether the framework adapted, pinned, or changed support.

## Client/server version skew

The type-only client contract comes from the server source/package. Runtime client and server versions still need compatible serialization/result semantics. Beta docs define the supported skew policy; default recommendation is matching minor versions until evidence supports broader compatibility.
