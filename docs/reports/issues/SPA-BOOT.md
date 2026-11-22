---
type: Issue Evidence Report
title: SPA-BOOT — Guided SPA starter mounts and creates a task
status: current
tags:
- examples
- spa-starter
- browser
---

# SPA-BOOT — Guided SPA starter mounts and creates a task

## Baseline and outcome

At `134f163` the production frontend constructed its typed client with
`baseUrl: ""`. `createClient()` requires an absolute URL, so module
initialization failed before React mounted even though the shell, bundle,
and API each passed their existing checks. The frontend and walkthrough
now use `window.location.origin`. The client contract is unchanged.

## Files and acceptance

- Owned: `examples/spa-starter/src/App.tsx` and `examples/spa-starter/README.md` correct and document same-origin setup.
- Adjacent: `examples/spa-starter/tests/starter.test.ts` reuses the existing Chromium driver. It opens `/app/projects/42` on the built server, observes the empty list, submits a task via the form, and verifies the returned title appears in the UI.
- Evidence: this report. No protected files or dependencies changed.

## Verification

A temporary copy of the tracked checkout was built with Bun 1.4.0 and
Google Chrome 156.0.8078.79; installs used `--ignore-scripts`.

- Root `bun install --frozen-lockfile --ignore-scripts`: passed.
- Starter `bun run setup && bun run build`: passed; used a locally packed `lugas@0.0.0-starter`.
- Before the fix, `LUGAS_REQUIRE_STARTER=1 LUGAS_REQUIRE_BROWSER=1 bun run test`: 24 passed, 1 failed (`Starter did not show the task form`).
- After the fix, `bun run build && bun run check && LUGAS_REQUIRE_STARTER=1 LUGAS_REQUIRE_BROWSER=1 bun run test && bun run verify:modes`: passed. All 25 tests passed, and the raw-source and pre-transpiled modes agreed on five cases.

## Boundaries and working tree

The starter assumes a browser and a same-origin API, as documented. No
new service exposure, credential handling, or authentication policy was
introduced. The browser smoke checks loading and creation; the existing
HTTP tests cover validation and protected operations. The full repository
and release gates were not run. SSE/ETag and WebSocket lifecycle fixes are
separate work. No external dependency changes, commits, or publication.
The working tree contains only the starter patch and this report.
