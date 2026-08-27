---
type: Owner Decision Record
title: 'ODR-0001: Package, Repository, and Brand Asset Identity'
status: accepted
tags:
- owner-decision
- naming
- release
- m6
---

# ODR-0001: Package, Repository, and Brand Asset Identity

## Context

LugasJS requires an approved package name, repository identity, and asset configuration before public beta release (v0.1.0-beta.1). Per ADR-0001, the official product name is **LugasJS** (shortened to **Lugas**).

## Decision

1. **Package Identity:** The npm package name is **`lugas`** (unscoped).
   - Package versioning: SemVer starting at `0.1.0-beta.1` for beta candidate.
   - Access configuration: `publishConfig: { "access": "public" }`.
   - Prerelease dist-tag: `beta` (`npm publish --tag beta`).

2. **Repository Identity:**
   - Primary GitHub repository: `ther12k/lugas` (transitioning to public on owner release authorization).
   - Upstream organization: `lugasjs` (provisional).

3. **Domain Identity:**
   - Canonical docs & problem URIs: `https://lugasjs.dev`.

4. **Fallback Stance:**
   - If unscoped `lugas` cannot be claimed during publication, the owner authorizes fallback to `@lugasjs/core` without modifying framework runtime contracts or public APIs.

## Release Readiness

- Naming availability confirmed in `docs/reports/m6-naming-availability.md`.
- Publication rehearsal tested in `scripts/release/package-beta.ts` and `docs/reports/m6-package-rehearsal.md`.
- Actual registry publish remains gated on final owner release sign-off (M6-GATE).
