---
type: Evidence Report
title: Registry Consumer Smoke — lugas@0.1.0-beta.4 from npm
status: complete
tags:
- evidence
- consumer-smoke
- release
- stabilization
---

# Registry consumer smoke — lugas@0.1.0-beta.4 (2026-09-12)

Gap closed: everything before this verified the repository; this run
verified **the package a user actually receives**. Installed from the npm
registry into a clean `/tmp` directory with no workspace, no checkout, and
no linkage to the repo. Lane: ODR-0018 release-engineering/evidence.

## Environment

- Consumer dir: `/tmp/lugas-consumer` (fresh `package.json`, `type: module`).
- `bun add lugas@beta` → **lugas@0.1.0-beta.4** (zero dependencies, zero
  peerDependencies; 680K installed).
- Consumer-side deps: `zod`, `drizzle-orm`; dev: `typescript@^7.0.2`,
  `@types/bun@^1.4.2` (resolved 1.4.2 — one patch above the repo's 1.4.0
  pin; both typecheck cleanly).
- Bun 1.4.0, linux x64.

## Package shape (as shipped)

- Exports resolve: `.` / `./client` / `./client/browser` / `./drizzle` /
  `./testing`; files: `src`, `build` (prebuilt browser ESM present),
  README, NOTICE, `docs/okf/architecture`.
- `bin`: `lugas → ./src/cli/main.ts` (`.ts` bin — consistent with the
  Bun-only policy; runs under `bunx --bun`).

## Capability lanes (all from the installed tarball)

| Lane | Result |
|---|---|
| Hello world + serve | 200 typed JSON |
| Health/readiness | `/health` ok, `/ready` ready |
| Validation (Zod body/query) | 422 `VALIDATION_FAILED` problem; query coercion works |
| Guard + cookies | 401 without session; `Set-Cookie` HttpOnly; guarded POST 201 |
| Drizzle service (`lugas/drizzle`) | SQLite in-memory CRUD via `sql` templates; `closeOnDispose` |
| Problem Details | `problem(418)` exact body |
| OpenAPI + Scalar | `/openapi.json` lists all 8 routes; `/docs` 200 |
| SSE | `event: hello` + data on stream |
| WebSocket | unauth upgrade rejected pre-handshake (1002); query-token echo works |
| Multipart upload | 201 with file facts |
| Redacted 500 | throw → `{"title":"Internal Server Error"}`, no internals |
| Structured logging | access entries with `requestId`, scalar fields only |
| Graceful shutdown | SIGTERM → clean exit (drain + dispose) |
| CLI from tarball | `bunx --bun lugas routes` table; `inspect` 13-route manifest JSON |
| Typed client | `createClient<AppContract<App>>` → `CONSUMER-CLIENT-OK` (typed bodies, coerced query, 401/418 discrimination) |
| Consumer typecheck | `bunx tsc --noEmit` exit 0 with `types: ["@types/bun"]` + `lib: ["esnext"]` + strict |

## Findings

| # | Finding | Class | Disposition |
|---|---|---|---|
| CF-1 | **Published `frameworkVersion` is `"0.0.0"`.** Repo `package.json` stays `0.0.0` by convention (version injected only into the staged packet); `scripts/sync-version.ts` exists for the constant but is wired into nothing. Every published tarball (beta.1–beta.4) ships `FRAMEWORK_VERSION "0.0.0"` — consumers' `app.manifest` and the CLI banner misreport the framework version. | Release-tooling bug | **Fixed** in `scripts/release/package-beta.ts`: staged constant stamped to `BETA_VERSION` with a fail-closed check; Consumer A now asserts `manifest.frameworkVersion` from the installed tarball. Full rehearsal re-run green (`staged framework-version stamped… FRAMEWORK_VERSION = 0.1.0-beta.4`; `SERVER-CONSUMER-OK … fw=0.1.0-beta.4`). Takes effect from the **next** published release; the npm beta.4 tarball is immutable and still carries 0.0.0 (known limitation below). |
| CF-2 | **Consumer typecheck fails without two undocumented settings.** Default `tsc` configs include lib.dom, whose `HeadersInit`/`BodyInit` conflict with `@types/bun` *inside the installed Lugas sources* (6 errors under `node_modules/lugas`). The working combination — `types: ["@types/bun"]`, `lib: ["esnext"]` (no DOM) — appeared nowhere in docs. | Docs gap | **Fixed**: "Type checking" section added to `docs/getting-started.md` with the exact tsconfig, the devDependencies, and an explanation of the failure mode. |
| CF-3 | **No `engines` field in the published package.** The Bun-only-through-1.4 policy is documented but not expressed in npm metadata; install under Node fails only at runtime. | Owner note | Not changed — `package.json` is a protected file and an `engines` policy is a release decision. Recorded for the owner ahead of the next packaging pass. |

## Rehearsal artifacts

The rehearsal re-run (proof of CF-1's fix) regenerated local artifacts under
`docs/releases/beta/`; they were **reverted** — the committed set is the
attestation of the *published* beta.4 tarball (sha256 `6c31b498…`, ODR-0018)
and must not be overwritten by an unpublished local rebuild. The fix's
evidence is this report's quoted rehearsal output and the per-release
rehearsal that will run at the next packet build.

## Known limitations

- npm's `lugas@0.1.0-beta.4` (and beta.1–beta.3) permanently report
  `frameworkVersion: "0.0.0"`; corrected only from the next published
  version.
- The smoke used linux x64 + Bun 1.4.0 only; the per-OS compatibility
  matrix remains the CI lanes' responsibility.

## Commands

From `/tmp/lugas-consumer` (contents: `app.ts`, `server.ts`, `client.ts`,
`tsconfig.json`): `bun add lugas@beta zod drizzle-orm`;
`bun add -d typescript @types/bun`; `PORT=3100 bun run server.ts`;
curl passes per lane table; `PORT=3100 bun run client.ts` →
`CONSUMER-CLIENT-OK`; `bunx tsc --noEmit` → exit 0;
`bunx --bun lugas routes ./app.ts`.
