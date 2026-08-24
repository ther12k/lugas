# Contributing to Lugas

## Setup

```bash
git clone https://github.com/ther12k/lugas.git
cd lugas
bun install
bun run verify  # typecheck + test + docs + diff
```

## Workflow

1. Create a worktree for your issue (see AGENTS.md).
2. Implement the smallest complete solution.
3. Run `bun run verify` before committing.
4. Create an evidence report at `docs/reports/issues/<ID>.md`.
5. Push and create a PR linking to the issue.

## Evidence reports

See `AGENTS.md` § Evidence enforcement for the required structure.
Use existing reports in `docs/reports/issues/` as examples.

## Code style

- No comments unless asked.
- No `any` at public boundaries.
- Follow existing patterns in the file you're editing.
