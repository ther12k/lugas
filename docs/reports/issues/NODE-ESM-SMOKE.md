---
type: Issue Evidence Report
title: NODE-ESM-SMOKE — Declare the artifact smoke fixture's module scope
status: current
tags:
- browser
- verification
- packaging
---

# NODE-ESM-SMOKE — Declare the artifact smoke fixture's module scope

## Baseline and outcome

The combined stabilization verification on Bun 1.4.0, Node 20.18.1,
and Chrome 156.0.8078.79 passed the build, typecheck, docs, and actual
browser checks. Its test lane failed one Node smoke test (`983 passed,
6 skipped, 1 failed`). The unchanged artifact test also failed when run
against an untouched `134f163` snapshot. Node classified the standalone
`.js` bundle as CommonJS because the temporary directory lacked the
shipped package's `"type": "module"` declaration; loading the ESM bundle
failed with `SyntaxError: Unexpected token 'export'`.

## Files and acceptance

- Owned: `tests/browser/artifact.test.ts` gives the temporary package the
  same module declaration as the real package. The actual `.js` artifact,
  Node process, and assertions about exit code, result, and stderr stay
  unchanged. No fixture is skipped and no runtime contract is broadened.
- Adjacent: this report. No protected file, dependency, or package artifact
  changed. The temporary JSON contains no secrets or runtime configuration.

## Verification

- `bun test tests/browser/artifact.test.ts -t 'artifact executes standalone under Node'`
  on untouched `134f163`: 1 failed with `Unexpected token 'export'`.
- In the combined-patch verification clone, built the starter from a local
  package using `bun run setup`, `bun run build`, and `bun run check`.
  `bun run verify:modes` passed all five raw/pre-transpiled comparisons.
- First `LUGAS_REQUIRE_STARTER=1 LUGAS_REQUIRE_BROWSER=1 bun run verify` run:
  all non-test checks passed except the developmental performance check,
  which was skipped because no benchmark archive was present. The sole
  test failure was the Node fixture above.
- After the fix, `bun test tests/browser/artifact.test.ts`: 3 passed. The
  second strict `bun run verify` exited 0: 984 passed, 6 skipped, 0 failed;
  the bundled starter UI and installed-artifact browser tests both ran.
  The development performance check was again skipped (no archive).
- `bun run verify:docs` and `git diff --check` passed in the working checkout.

## Boundaries and working tree

This verifies Node only as a consumer of the browser client artifact;
Lugas's server remains Bun-only. The local build regenerated the starter
asset map in the verification clone only. Earlier SPA, SSE, WebSocket,
and conditional-response patches remain uncommitted in the workspace.
No release-mode benchmarks, attestation, commits, or publication.
