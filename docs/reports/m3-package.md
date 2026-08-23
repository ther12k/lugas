---
type: Packaging Report
title: M3 Package Candidate — `lugas/client` Subpath
status: accepted
tags:
- packaging
- client
- exports
- m3
---

# M3 Package Report (M3-018)

## Export map

```json
{
  ".":       { "types": "./src/index.ts",      "default": "./src/index.ts" },
  "./client": { "types": "./src/client/index.ts", "default": "./src/client/index.ts" }
}
```

`src/client/index.ts` re-exports the public client surface only:
`createClient`, URL helpers (`normalizeBaseUrl`, `joinUrl`,
`interpolatePath`, `appendQuery`, `serializeQuery`), request builder
(`buildRequestInit`), result parser (`parseResponse`), all four stable error
classes with their diagnostic codes, and the full contract/result type set
(`LugasClient`, `Method*Input`, `ClientCallResult`, …). Internal helper
modules are NOT exposed as subpaths — the exports map locks the surface down.

## Verification (all executable in `tests/package/client-export/`)

| Check | Result |
|---|---|
| `import "lugas/client"` resolves under Bun (self-reference anchored inside the package) and exposes `createClient` / `ClientDecodeError` | PASS |
| `lugas/client/create-client` and other internal subpaths are locked down (imports fail) | PASS |
| Client surface contains no server symbols (`defineApp` etc.) — root import not required at client runtime | PASS |
| Browser-target bundle of a bare `"lugas/client"` import succeeds; emitted JS contains no `defineApp` / `Bun.` markers; executes under Node printing `BUNDLE-SUBPATH-OK` | PASS |
| `npm pack --dry-run --json` | 62 entries; includes every client module + root index; zero `benchmarks/`, `.worktrees/`, or stress-fixture paths |

## Tarball summary

Top-level: `package.json`, `README.md`, `AGENTS.md`, `docs/okf/architecture/*`,
`src/**`. Declarations are shipped as TypeScript sources (types conditions
point at `.ts` entry files) per the pre-release packaging strategy;
`.d.ts` emission is deferred to release tooling.

## Command mapping

Planned `bun run package:dry-run` is unwired (script additions to
`package.json` beyond this issue's export-map ownership are deferred);
canonical equivalent: `npm pack --dry-run --json` at repo root, asserted
inside `tests/package/client-export/client-export.test.ts`.
