---
type: Agent Operating Standard
title: LugasJS Repository Agent Instructions
status: current
tags:
- agents
- worktree
- governance
---

# LugasJS Repository Agent Instructions

## Source precedence

1. Explicit owner instruction in the current task.
2. Accepted ADRs in `docs/okf/decisions/`.
3. The issue assigned to the current worktree.
4. Architecture and engineering specifications.
5. Roadmap and backlog summaries.

## Quick reference

### Verification commands

```bash
bun run verify          # full gate: typecheck + test + docs + diff
bun run typecheck       # tsc --noEmit (includes tests/**/*.test-d.ts)
bun test                # all tests
bun run verify:docs     # OKF document validator
```

### Key files

| File | Purpose |
|---|---|
| `src/index.ts` | Root public exports |
| `src/client/index.ts` | Client subpath exports |
| `docs/manifest-v1.md` | Frozen manifest schema |
| `docs/diagnostics.md` | Diagnostic catalog |
| `docs/client-error-semantics.md` | Error/redaction policy |

### Worktree workflow

```bash
git worktree add .worktrees/<ID> -b agent/<ID>-<slug> main
cd .worktrees/<ID>
bun install --frozen-lockfile
git add -A && git commit && git push -u origin <branch>
gh pr create && gh pr merge <branch> --merge
cd ../.. && git worktree remove .worktrees/<ID>
```

## Non-negotiable architecture

1. Bun-only through 1.x.
2. Bun's native router remains the request-path router.
3. Public APIs remain small, explicit, object-based, statically searchable.
4. Native Request/Response/Headers/URL/FormData/ReadableStream remain available.
5. No ORM/auth product/OpenAPI/JSX/WebSocket/cloud adapter without ADR.
6. Do not depend on Elysia or Eden.
7. No performance claims without reproducible evidence.
8. Compile-time and runtime facts are distinct systems.
9. Package names/repo creation/license/org/domain/release are owner decisions.

## Shared-file discipline

Protected: package.json, bun.lock, src/index.ts, src/client/index.ts,
src/testing/index.ts, tsconfig*.json, .github/workflows/*. Only the owning
issue may edit these; others must document pending exports in evidence.

## Evidence enforcement

Every implementation task creates `docs/reports/issues/<ID>.md` with:
baseline, outcome, files changed (owned/adjacent), assumptions, acceptance
mapping, exact commands/results, security considerations if applicable,
known limitations, deferred work, dependency/merge notes, working-tree state.

## Prohibited shortcuts

- Do not weaken a test to make it pass.
- Do not replace a failing benchmark baseline with an easier one.
- Do not invent runtime metadata from TypeScript types.
- Do not add `any` at public boundaries without proof.
- Do not start later-milestone work because nearby code looks useful.
- Do not publish packages/repos/assets/licenses without owner approval.

## Stop conditions

Stop only for: irreversible owner decisions; missing/contradictory dependency contracts; architecture violations; missing credentials/infrastructure; security/licensing review needs.
