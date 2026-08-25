---
type: Stress Report
title: M5 10,000-Route Runtime and Type Stress Closure
status: accepted
tags:
- stress
- route-count
- memory
- m5
---

# M5 10,000-Route Stress Closure

Environment (pinned): Bun 1.4.0, Linux x86-64, i5-13420H, 15 GB RAM.

## Results

| metric | value |
|---|---|
| composition time | 86 ms |
| manifest serialization | 10 ms |
| manifest routes | 10,000 |
| RSS after composition | 66 MB |
| heap used | 14 MB |

## Interpretation

Composition scales sub-linearly from M5-004 data (100→1000→10000 = 3→15→86 ms,
roughly ×6 for ×10 routes). Memory grows linearly at ~13 KB/route. No
pathological behavior detected. No hidden request-time route table created.

## Supported target vs stress-only evidence

The **500-route budget is ACCEPTED** (from M3-017). The 1,000-route result
(166 ms typecheck, 46 MB runtime) is also practical. The 10,000-route result
is disclosed as stress-only evidence — not a supported target.

## Limitations

In-process measurement; TypeScript compilation cost for the full 10k-route
fixture is covered by M3-017's committed evidence (287 ms cold / 156 MB).
