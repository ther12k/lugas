# M6R2-D Evidence — Runtime boundary: shape validation ordering, descriptor depth, notFound parity

## Baseline
- Base commit: `5df0843` (main, publication-integrity merged)
- Issues: #286 (routes shape order), #287 (descriptor structural validation), #288 (notFound fallback)
- Bun/TypeScript: 1.4.0 / 7.0.2, linux-x64

## Outcome

Completed — three startup-contract gaps closed:

- **#286**: `defineApp()` now validates the routes-map SHAPE first
  (`null`, arrays, and non-objects all receive the stable `LUGAS_APP_006`
  diagnostic) before enumerating paths; live probe confirms null no longer
  yields a native TypeError.
- **#287**: structural validation completed at factory boundaries:
  - `route()`'s `before` entries must have a string name AND a function
    handler (`LUGAS_ROUTE_005`);
  - module entries at `defineApp()` must carry name AND a routes map
    (`LUGAS_APP_004`).
  Malformed JS/plugin descriptors now fail at declaration with stable codes,
  not deep in the request path. Nominal branding remains compile-time by
  design; runtime identity is explicitly structural (documented stance).
- **#288**: custom `notFound` policies get second-line redaction parity with
  `onError`: throw / rejection / non-Response falls back to the default redacted
  404 problem instead of surfacing through Bun's dev error page. Healthy
  custom policies keep full control.

## Files changed
- `src/core/app.ts` — owned (#286/#287): shape-first validation + module-entry depth.
- `src/core/route.ts` — owned (#287): guard handler-shape check.
- `src/internal/serve.ts` — owned (#288): safeNotFound wrapper.
- `tests/unit/runtime-boundary.test.ts` — owned (new): 10 tests.
- `docs/reports/issues/M6R2-D.md` — this evidence report.

## Acceptance mapping

| Criterion | Test | Result |
|---|---|---|
| routes null/array/string → LUGAS_APP_006 | tests 1–3 | pass |
| Malformed guard entries rejected at route() | tests 4–6 | pass |
| Module entries without routes rejected at defineApp() | test 7 | pass |
| Throwing custom notFound → redacted 404, no leak | test 8 (message asserted absent) | pass |
| Non-Response notFound → default problem | test 9 | pass |
| Healthy notFound keeps control | test 10 | pass |

## Exact commands and results
```text
bun test tests/unit/runtime-boundary.test.ts   # 10 pass, 0 fail
bunx tsc --noEmit                              # clean
bun run verify                                 # exit 0
```

## Security considerations
notFound fallback closes the redaction asymmetry flagged P3; custom policy
errors and stack traces cannot reach clients via the miss path.

## Known limitations / deferred
Runtime symbol branding intentionally deferred to a future ADR if ever needed;
structural validation is the consistent model going forward.

## Working-tree state
Clean at handoff.
