---
type: Toolchain Manifest
title: Pinned Toolchain
status: active
tags:
- toolchain
- bun
- typescript
- determinism
issue: M0-003
---

# Pinned Toolchain

Single source of truth for the exact toolchain this repository is verified against. Changes go through the dedicated compatibility/upgrade workflow (M5-010, M6-006): a version bump requires a new commit here, a regenerated `bun.lock`, and re-run verification commands.

| Tool | Exact version | Pinned by |
|---|---|---|
| Bun | 1.4.0 | `.bun-version`, CI (M0-004), local verification |
| TypeScript | 7.0.2 | `package.json` devDependency (exact, no range) |
| `@types/bun` | 1.4.0 | `package.json` devDependency (exact, matches Bun) |

Print both versions: `bun run versions` (runs `bun --version && tsc --version`).

## Lockfile

- `bun.lock` is committed; installs must use `bun install --frozen-lockfile` (CI does).
- SHA-256 at pin time: `f4697377625308f07bbbb7cc9eeb2d2a31b133e0e269889dc95a886b1b7d4d74`
- Production dependency count: **0** (target through 0.x; devDependencies are tooling only).

## Verification baseline (executed 2026-08-21, Linux 7.0.0-28-generic x64)

```text
bun install --frozen-lockfile   # pass (clean checkout of this branch)
bun run versions                # 1.4.0 / Version 7.0.2
bunx tsc --noEmit               # pass (exit 0)
bun test tests/unit/toolchain.probe.test.ts  # 1 test, 0 fail
```

## Notes

- TypeScript 7.0.2 (native compiler) was selected as current stable and verified against `@types/bun` 1.4.0 with a native `Bun.serve` probe (`tests/unit/toolchain.probe.test.ts`).
- `package.json` stays `private: true` with version `0.0.0`; package identity is owner-blocked (OD-001).
- Script `verify:docs` targets `scripts/verify-okf.ts`, which M0-005 introduces; until then the command fails honestly (missing file) rather than silently passing.
