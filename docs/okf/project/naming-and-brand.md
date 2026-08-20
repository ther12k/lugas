---
type: Brand Specification
title: LugasJS Naming, Package, and Brand Rules
status: draft
tags:
- brand
- naming
- package
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS Naming, Package, and Brand Rules

## Product name

- Official product name: **LugasJS**.
- Conversational and code-facing short name: **Lugas**.
- Tagline: **Clear, typed APIs on native Bun.**
- Positioning line: **A small Bun-native TypeScript framework designed for humans and coding agents.**

“Lugas” expresses the intended product quality: direct, clear, and not convoluted. The design must keep earning the name; it is not permission to call a complex API simple.

## Proposed code names

| Asset | Preferred | Status |
|---|---|---|
| Package | `lugas` | provisional until registry reservation |
| Fallback scope | `@lugasjs/core` or a single scoped package | owner decision |
| Client export | `lugas/client` | proposed |
| Testing export | `lugas/testing` | proposed |
| CLI binary | `lugas` | proposed |
| Repository | `lugasjs/lugas` | provisional |
| Website/domain | not selected | owner decision |

## Rules

- Do not publish under an unverified package or organization name.
- Do not create confusing package fragmentation before the single-package model is proven.
- Public TypeScript identifiers use English.
- Product prose may explain the Indonesian meaning but must remain understandable internationally.
- Avoid mascot, visual identity, or domain work before package/repository ownership is resolved.
- Record any collision, legal concern, or package availability result in the owner-decision issue rather than silently renaming imports.

## Owner gate

M6-004 must verify npm, GitHub, domain, and basic trademark/search risks at the time of release. This document records the product decision, not asset ownership.
