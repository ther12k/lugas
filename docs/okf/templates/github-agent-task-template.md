---
type: Template
title: GitHub Worktree Agent Task Template
status: draft
tags:
- template
- github
- agent
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ID — Task title

## Outcome

One observable result.

## Why

Why this task exists and what dependency it unlocks.

## Source documents

- Link to architecture/engineering/ADR concepts.

## Dependency contract

- **Depends on:** IDs and exact artifacts assumed.
- **Blocks:** IDs.
- **Agent-ready when:** merged dependencies, no file conflict, no owner blocker.

## In scope

- Concrete behavior.

## Non-goals

- Explicitly excluded adjacent work.

## Owned files

```text
paths
```

Do not edit shared files not listed here.

## Implementation sequence

1. Inspect baseline and dependency evidence.
2. Add failing tests or spike fixture.
3. Implement minimum behavior.
4. Add negative/security/type cases.
5. Run verification.
6. Write evidence.

## Acceptance checklist

- [ ] Observable criterion.
- [ ] Negative criterion.
- [ ] Public type criterion.
- [ ] Documentation/evidence criterion.

## Verification

```bash
commands
```

## Evidence required

Create `docs/reports/issues/ID.md` from the evidence template.

## Integration notes

Merge ordering, export owner, conflict group, and follow-up.

## Stop point

Do not implement later tasks or opportunistic refactors.
