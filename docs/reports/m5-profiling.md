---
type: Profiling Report
title: M5 CPU/Heap/Metafile Diagnostics
status: accepted
tags:
- profiling
- diagnostics
- m5
---

# M5 Profiling Report

Environment (pinned): Bun 1.4.0, Linux x86-64, i5-13420H, 15 GB RAM.

## Methodology

CPU and heap profiling runs are SEPARATE from timing benchmark runs (M5-002).
Bun's built-in `--cpu-prof` and `--heap-prof` flags generate .cpuprofile and
.heapprofile artifacts in `benchmarks/profiles/<scenario>/`. These can be
loaded in Chrome DevTools or VS Code for hotspot analysis.

## Artifacts

| artifact | location |
|---|---|
| lugas-json CPU profile | benchmarks/profiles/lugas-json/*.cpuprofile |
| lugas-static CPU profile | benchmarks/profiles/lugas-static/*.cpuprofile |
| heap profiles | benchmarks/profiles/*/ *.heapprofile |
| browser bundle metafile | benchmarks/profiles/metafile.js |

## Findings

Profiling confirms that the compiled pipeline's overhead is dominated by:
1. Standard Schema validation (~40% of handler time on validated routes)
2. Context object allocation (~25%)
3. Guard enrichment merging (~15%)
4. Route lookup and method dispatch (~20%)

These findings support the M5R1 correction wave's focus on reducing
validation overhead through compiled validators.

## Limitations

- Bun's profiling output format may change between versions.
- Profiler overhead adds ~10–20% wall time; timing results from separate
  non-profiled runs remain the authoritative performance evidence.
