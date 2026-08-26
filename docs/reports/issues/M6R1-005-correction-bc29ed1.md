# M6R1-005 Correction Report — bc29ed1 claimed changes (rehomed from M4-015)

## Context

Commit `bc29ed1` (`fix(m5r1): freeze guard chains, reject nested maps, fix async validator sentinel`)
overwrote `docs/reports/issues/M4-015.md` (agent-docs evidence) with content about
guard-chain freeze, nested method-map rejection, and async sentinel replacement.
This broke the issue-to-evidence audit trail because M4-015 (#84) is
"Generate full agent reference and Lugas skill document", not a correction wave.

This report captures what bc29ed1 intended to record, with an accurate
account of what was **actually committed** vs what the report claimed.

## Baseline
- Correction commit: `bc29ed1`
- Base: `43a382b` (main at time of commit)

## What bc29ed1 actually changed (verified via `git show bc29ed1 --name-only`)

```
docs/reports/issues/M4-015.md         ← evidence only (misplaced)
src/internal/compile-pipeline.ts      ← explicit completed Set added
src/internal/prepared-app.ts          ← nested method-map rejection + dead-code cleanup
```

## What bc29ed1 claimed but did NOT change

- `src/core/route.ts` — guard-chain freeze — **not in this commit**.
  The actual fix landed in PR #267 (M6R1-004, commit `bffc621`).

## Findings corrected by the actual committed code

| Finding | File changed | What was done |
|---|---|---|
| Async validator sentinel (duplicate-stage risk) | `src/internal/compile-pipeline.ts` | Replaced `undefined` sentinel with explicit `Set<string>`; started set construction |
| Nested method map not rejected | `src/internal/prepared-app.ts` | Added rejection of plain-object values in method-map position |
| Dead code cleanup | `src/internal/prepared-app.ts` | Removed stale branch |

## Remaining gap (tracked as M6R1-003 #258)

The Set is created fresh per `executeAsyncPipeline` call; completed stages
from the sync portion are not carried in. Tracked separately.

## Evidence integrity note

The corrected M4-015.md (restored from `e9ccc69`) now covers agent-docs
generation. This report is the canonical record for bc29ed1's changes.
