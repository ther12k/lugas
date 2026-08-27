---
type: Review Report
title: M6 Naming, Package, and Asset Availability Report
status: complete
tags:
- naming
- m6
- release
---

# M6 Naming, Package, and Asset Availability Report

**Date:** 2026-08-27  
**Candidate Commit:** `92833dd`  
**Target Brand:** LugasJS / Lugas (ADR-0001)

## 1. Registry Availability (npm)

Registry checks performed against `registry.npmjs.org`:

| Name / Scope | Status | Result | Notes |
|---|---|---|---|
| `lugas` | Available (404) | Unclaimed | Preferred unscoped package name |
| `@lugasjs/core` | Available (404) | Unclaimed | Fallback scoped name |
| `@lugas/core` | Available (404) | Unclaimed | Fallback scoped name |

## 2. Repository & Organization Assets (GitHub)

| Asset | Current / Target | Status |
|---|---|---|
| Repository | `ther12k/lugas` | Active private repo; candidate for public release |
| Organization | `lugasjs` / `lugas-framework` | Provisional / owner-directed |

## 3. Domain & Web Properties

| Property | Value | Usage |
|---|---|---|
| Problem Details URI | `https://lugasjs.dev/problems/*` | Stable RFC 9457 type URIs in validation & error modules |
| Statement / Schema URI | `https://lugasjs.dev/statements/*` | Provenance and rehearsal statement namespaces |

## 4. Collision & Trademark Analysis

- **Etymology & Meaning:** "Lugas" is an Indonesian word meaning *straightforward, clear, direct, to the point*.
- **Ecosystem Uniqueness:** Distinctive in the JavaScript / TypeScript / Bun ecosystem. Zero namespace collisions with existing web framework brands (Express, Fastify, Hono, Elysia, Nest, Koa).
- **Collision Risk:** Low. No active commercial conflicts in developer tooling.

## 5. Recommended Fallback Hierarchy

If the unscoped `lugas` package name becomes unavailable at publication time:
1. Primary fallback: `@lugasjs/core` or `@lugasjs/lugas`
2. Secondary fallback: `@lugas/core`

All internal modules use relative imports; package export maps (`package.json`) seamlessly adapt to any approved package name without altering technical contracts.
