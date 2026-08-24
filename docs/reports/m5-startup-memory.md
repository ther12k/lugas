---
type: Benchmark Report
title: M5 Route-Count Startup and Memory
status: accepted
tags:
- benchmark
- startup
- memory
- m5
---

# M5 Route-Count Startup and Memory

Environment (pinned): Bun 1.4.0, Linux x86-64, i5-13420H, 15 GB RAM.
3 independent runs per count (100 and 1,000 routes).

## Results

| routes | median compose ms | manifest ms | rss MB | heap MB | manifest routes |
|---|---|---|---|---|---|
| 100 | 3 | <1 | 34 | 1 | 100 |
| 1,000 | 15 | 1 | 46 | 2 | 1,000 |

## Interpretation

Route composition is sub-linear: 10× routes costs ~5× compose time (4→17ms).
Memory grows modestly: +12 MB RSS for +900 routes (~13 KB/route).
Manifest serialization is negligible (<1 ms at all scales).

Combined with M3-017 typecheck data (166 ms cold / 500-route), the framework
is well within practical bounds for beta-scale applications.

## Limitations

In-process measurement (no subprocess isolation). Bun GC not forced between runs.
M3-017 provides complementary TypeScript compilation cost data.
