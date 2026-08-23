# M3 Client Bundle Report (M3-014)

Measured 2026-08-23 on the pinned toolchain (Bun 1.4.0, TypeScript 7.0.2,
Node v24.11.0 for the execution smoke). Sizes are recorded for regression
tracking only — they are not marketing numbers.

## Bundle provenance

- Entrypoint: `tests/package/client-browser/browser-fixture.ts` — imports
  every `src/client/*` module plus TYPE-ONLY server types, exercises GET with
  path params + Unicode query, POST with JSON body, and pure helpers.
- Build: `Bun.build({ target: "browser" })`, no minify.

## Results

| Check | Result |
|---|---|
| Source graph (`bun run scripts/check-client-graph.ts`) | PASS — every runtime import stays inside `src/client/**`; server types are type-only; zero `bun` / `node:` / testing/CLI specifiers |
| Bundle token scan | PASS — no `src/core/app`, `defineApp`, `Bun.`, `from "bun"`, or `node:` markers in emitted JS |
| Execution smoke (`node tests/package/client-browser/smoke-wrapper.mjs`) | PASS — artifact runs under standalone Node v24 (a runtime that never had a `Bun` global), exercising createClient end-to-end against a fetch stub; prints `CLIENT-SMOKE-OK` |
| Full bundle size | 14,910 B (unminified, all client modules) |
| Tree-shaken size (entry importing only `normalizeBaseUrl`) | 1,149 B — confirms unused surface is excluded where the build supports it |

## Command mapping

The issue's verification commands are package scripts; `package.json` is a
protected shared file this issue does not own, so executable canonical
equivalents are recorded here:

| Planned script | Canonical replacement used |
|---|---|
| `bun run test:browser-import` | `bun test tests/package/client-browser` |
| `bun run bundle:client:inspect` | `bun run scripts/check-client-graph.ts` (+ in-test bundle scan) |

The integrator issue M3-018 may wire these as real scripts pointing at the
same targets.

## Limitations

- The execution smoke runs on Node's engine (V8) rather than a second JS
  engine inside Bun's family; cross-engine conformance beyond JSC/V8 remains
  for packed consumer tests (M3-018).
- Minified sizes were not measured; unminified output keeps identifiers
  stable for the forbidden-token scan.
