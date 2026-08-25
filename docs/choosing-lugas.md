# Choosing Lugas

## Choose Lugas if you want

- Compile-time type safety between server and client
- Standard Schema validation without lock-in
- Deterministic runtime manifests for inspection
- A small explicit API surface
- Zero production runtime dependencies

## Choose raw Bun if you want

- Absolute minimum overhead
- Direct access to Bun's full API surface
- No abstraction layer

## Choose Elysia if you want

- WebSocket support
- Rich plugin ecosystem
- OpenAPI generation from schemas
- Lifecycle hooks at the framework level

## Performance

See docs/reports/m5-plain-performance.md for measured data.
Static routes show no measurable overhead; validated routes trade
~17% throughput for typed context derivation and error boundaries.
