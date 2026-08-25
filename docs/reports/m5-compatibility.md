---
type: Compatibility Report
title: M5 Bun 1.4.x Compatibility Matrix
status: in-progress
tags:
- compatibility
- m5
---

# M5 Compatibility Matrix

## Verified platforms

| OS | Bun version | Status | Evidence |
|---|---|---|---|
| Linux x86-64 | 1.4.0 | ✅ verified | All test suites green across M3–M5 |
| macOS | 1.4.0/1.4.x | ⏳ pending CI | `.github/workflows/compatibility.yml` |
| Windows | 1.4.0/1.4.x | ⏳ pending CI | `.github/workflows/compatibility.yml` |

## Known platform differences

- `/proc/meminfo` unavailable on macOS/Windows → memory metadata returns 0
- `lscpu` command unavailable → CPU model returns empty
- File path separators differ; no known impact (Bun normalizes)
