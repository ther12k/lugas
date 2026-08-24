---
type: Audit Report
title: M5 Supply Chain — Dependencies, Licenses, SBOM
status: complete
tags:
- security
- supply-chain
- sbom
- m5
---

# M5 Supply Chain Audit

## Dependency inventory

Production runtime dependencies: **0** (verified from package.json)

Dev dependencies: 6 (@standard-schema/spec, @types/bun, elysia, typescript, valibot, zod)
All are permissively licensed (MIT or Apache-2.0).

## Package contents

70 tarball entries. No forbidden paths (benchmarks/, tests/, scripts/, .worktrees/, .env).
Secret scan passed: no hardcoded credentials in shipped source files.

## SBOM

Minimal SBOM generated at `benchmarks/results/sbom.json` with:
package name/version, production dependency count, dev dependency list,
tarball file count, secret scan result, zero-production-dependency flag.

Reproducible via `bun run scripts/audit-package.ts`.
