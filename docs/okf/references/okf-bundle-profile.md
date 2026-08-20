---
type: Reference
title: OKF v0.2-Style Bundle Profile Used by This Package
status: stable
tags:
- reference
- okf
- format
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# OKF v0.2-Style Bundle Profile Used by This Package

This package follows the supplied Open Knowledge Format v0.2 conventions used in the owner's earlier architecture bundles.

## Profile

- Root `index.md` frontmatter declares `okf_version: "0.2"`.
- Directory `index.md` and `log.md` files are reserved navigation/lifecycle files.
- Other Markdown concepts have YAML frontmatter with a required non-empty `type`.
- Concept identity is the path within the bundle.
- Relative links connect concepts.
- Unknown metadata is tolerated and should survive tooling.
- This package adds stricter local checks for links, issue dependencies, cycles, and ZIP contents.

## Trust statement

Passing the local validator means the bundle is structurally self-consistent under this profile. It does not certify the technical design, approve ADRs, verify implementation, or represent Google endorsement.
