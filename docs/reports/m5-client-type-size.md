---
type: Benchmark Report
title: M5 Client Bundle + TypeScript Contract Cost
status: accepted
tags:
- benchmark
- client
- typescript
- m5
---

# M5 Client Bundle + TypeScript Contract Cost

Environment (pinned): Bun 1.4.0, TypeScript 7.0.2, Linux x86-64, i5-13420H, 15 GB.

## Client bundle

| metric | value |
|---|---|
| raw (unminified) | 14,900 B |
| gzip | ~4,144 B |

No server code in bundle graph: `src/core/app`, `defineApp(`, and `Bun.serve` absent.

## TypeScript contract cost

| scenario | time |
|---|---|
| full repo typecheck | ~1,354 ms |
| M3-017 baseline: 500 routes cold check | 166 ms / 111 MB |
| M3-017 baseline: 1000 routes cold check | 287 ms / 156 MB |

Full typecheck includes all tests, fixtures, and benchmarks — not just the framework source. The per-fixture cost remains within the accepted gate from M3-017.

## Limitations

Minified/gzip sizes measured on unminified output. True minification requires a minifier pass which is deferred to release tooling.
