# Evidence Report Guide

Every implementation task must produce an evidence report at
`docs/reports/issues/<ID>.md`. Use this guide to write yours.

## Required sections

1. **Baseline**: commit, branch, worktree, versions, OS.
2. **Outcome**: completed / partial / blocked with one-sentence summary.
3. **Files changed**: owned vs adjacent, with reason for adjacent edits.
4. **Assumptions**: design decisions made during implementation.
5. **Acceptance mapping**: table linking each criterion to its test/command.
6. **Commands and results**: exact commands and their output summary.
7. **Security considerations** (if applicable).
8. **Known limitations** (if any).
9. **Deferred work** (if any).
10. **Dependency and merge notes**.
11. **Working-tree state**: "Clean at handoff; closes <ID>."

## Example

See `docs/reports/issues/M3-006.md` for a complete example.
