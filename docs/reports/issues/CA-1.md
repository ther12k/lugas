---
type: Issue Evidence Report
title: 'CA-1 — Secure-headers pass silently dropped static method-map entries (assets and native file routes)'
status: complete
tags:
- evidence
- correctness
- security-headers
- assets
---

# CA-1 Evidence Report

Found during the post-dogfood roadmap assessment (2026-09-12): a reduced probe against `defineApp()` showed that configuring `secureHeaders` empties every static entry inside compiled method maps. No issue number existed; this report is the issue record.

## Baseline

Branch base: `f0db64a` (merge of PR #402, clean main).

Pre-existing state: the secure-headers pass in `src/internal/prepared-app.ts` rebuilt every method map keeping only function-valued entries (`if (typeof entry !== "function") continue;`). Non-function entries — native `Bun.file` values declared inside method maps, and every `assets.files` mapping (compiled as `{ GET: Bun.file(...) }` by `src/internal/assets.ts`) — were dropped from the rebuilt map. Reduced probe at baseline:

```
--- no secureHeaders ---              --- with secureHeaders ---
/api/hello    => map { GET: fn }     /api/hello    => map { GET: fn }
/native-file  => map { GET: Blob }   /native-file  => map {  }
/logo.svg     => map { GET: Blob }   /logo.svg     => map {  }
```

Effects at baseline: with `secureHeaders` configured, native file routes served 404 and every asset mapping vanished — `secureHeaders` + `assets` (the combination an SPA deployment needs) was broken end to end. No test covered asset/native-file serving under the policy (`tests/production/production.test.ts` used `assets` only for a health-collision failure test).

## Outcome

One behavioral correction, no API change: the rebuilt method map now preserves non-function entries verbatim (functions are still wrapped with the fill-if-absent policy). This restores the documented truth — `docs/production.md` ("Static values (`Response`, `Bun.file`, `{ dir }`) and assets bypass the pipeline and carry none") and the pass's own source comment. Static entries still carry no policy headers; they serve again.

Top-level static entries (`Response`/`Blob`/`{ dir }` at a path) were already preserved via `continue` and are unchanged. The sibling CORS pass is untouched: it deliberately fails closed (`LUGAS_CORS_004`) on static entries, and CORS+assets is still rejected earlier.

Regression test added to `tests/production/production.test.ts` (`secureHeaders` describe): asserts the compiled `bunRoutes` keep `Blob` values for a native file route and an asset mapping under `secureHeaders`, that both serve 200 with correct bodies through `createTestServer`, and that a function route in the same app still receives the policy headers. Verified to bite: with the fix stashed, the new test fails (0 pass / 1 fail); with the fix applied, 13/13 pass.

## Files changed

Owned (CA-1):

- `src/internal/prepared-app.ts` — secure-headers method-map rebuild preserves non-function entries; comment states the constraint
- `tests/production/production.test.ts` — regression test + `node:path` import
- `tests/production/fixtures/note.txt`, `tests/production/fixtures/logo.svg` — new minimal serving fixtures

Adjacent: none outside the owned set.

## Assumptions

- Preserving (not rejecting) static entries is the intended semantics: `docs/production.md` and the in-source comment both document that static values/assets carry no policy headers but serve. The alternative (fail closed like CORS) would contradict both.
- Static entries must not be wrapped: wrapping a native file/Response value into a handler would change serving semantics and silently start claiming policy enforcement on values the pipeline never sees; rejected deliberately.

## Acceptance mapping

- Static method-map entries survive the pass → compiled-shape assertions (`toBeInstanceOf(Blob)`) and serving assertions (200 + body) in the new test.
- Function entries still wrapped → `/api` response carries `x-content-type-options: nosniff` in the same app.
- No silent behavior change when `secureHeaders` is absent → entire existing suite passes unchanged (only the pre-existing perf-gate failures below).
- Documented truth matches behavior → `docs/production.md:47` unchanged; code now conforms.

## Exact commands and results

```
bun test tests/production/production.test.ts
  → 13 pass, 0 fail (was 12 pass before the new test)

git stash push src/internal/prepared-app.ts && bun test tests/production/production.test.ts -t "CA-1"
  → 0 pass, 1 fail (regression test bites on unfixed source); stash popped

bun run verify
  → typecheck PASS; tests 875 pass / 6 skip / 10 fail; docs PASS; diff PASS;
    llms/agent-docs PASS; perf-gate SKIP (no archive)
```

The 10 failures are all in `tests/unit/perf-gate-integrity.test.ts` and are pre-existing at baseline `f0db64a` (identical run on pristine main: 0 pass / 10 fail). Root cause: commit `522c363` added `import { CANDIDATE_VERSION } from "./release/candidate-version"` to `scripts/check-performance-budget.ts`, while the test's sandbox copies only the checker file into a temp dir — the spawned checker dies with `Cannot find module './release/candidate-version'`. Unrelated to this fix; tracked separately (CA-3).

## Security considerations

The bug made the policy path *drop* content rather than skip headers — a serving-availability defect, not a header leak. No static response ever carried policy headers (before or after), so nothing was falsely claimed as protected. The fix does not widen what the policy applies to.

## Known limitations / Not exercised

- `{ dir }` mounts combined with `secureHeaders` are not covered by a serving test (they were already preserved via the top-level `continue`; the in-map `{ GET: { dir } }` shape now also survives, but Linux-only directory mounts keep this out of CI scope here).
- The CORS pass's fail-closed behavior on static entries is unchanged and already covered by existing tests.

## Deferred work

- SPA/Vite hosting composition (asset caching policy, HTML vs hashed-asset cache headers) remains the separate roadmap item assessed on 2026-09-12; this fix only restores correct serving under an existing policy.

## Dependency / merge notes

- Independent of CA-2 (SSE heartbeat) and CA-3 (perf-gate sandbox); any merge order is safe. No protected files touched (`package.json`, `bun.lock`, `src/index.ts`, `src/client/index.ts`, `src/testing/index.ts`, `tsconfig*.json`, workflows all untouched).

## Working-tree state

Clean after commit: `src/internal/prepared-app.ts`, `tests/production/production.test.ts`, `tests/production/fixtures/{note.txt,logo.svg}`, `docs/reports/issues/CA-1.md`.
