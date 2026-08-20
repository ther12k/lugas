---
type: Operations Guide
title: Importing the LugasJS Backlog into GitHub
status: draft
tags:
- github
- issues
- import
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Importing the LugasJS Backlog into GitHub

## Preparation

1. Create the private repository only after owner authorization.
2. Create milestones and labels from [Labels and Milestones](../delivery/labels-and-milestones.md).
3. Import M0 issues first, then later milestones, preserving stable IDs in titles.
4. Add dependencies using GitHub task relationships or the issue body's `Depends on` links.
5. Use a GitHub Project view with ID, milestone, wave, area, status, owner, worktree, and conflict group.

## Manual command pattern

```bash
gh issue create   --title "M0-001 — Freeze design baseline and decision registry"   --body-file "docs/okf/issues/m0/M0-001-freeze-design-baseline.md"   --label "agent-ready,type:docs,area:architecture,priority:p0,size:s"   --milestone "M0 — Design Freeze and Baselines"
```

The [GitHub Create Commands](../delivery/github-create-commands.md) contains generated commands for every issue. Review repository owner/name, labels, and milestone existence before execution.

## Import rules

- Do not strip frontmatter; GitHub displays it as a metadata block and it remains useful when copied back to docs. If preferred, an import script may remove frontmatter while preserving it in repository files.
- Do not renumber IDs to match GitHub issue numbers.
- Stable ID appears at the beginning of every title.
- Gate issues remain open until every required child is merged and independently reviewed.
- Owner-decision issues receive `owner-decision` and are never assigned autonomously.

## Project automation

Recommended automation:

- new issue → `Backlog`;
- dependencies satisfied + no owner blocker → `Ready`;
- PR opened → `In review`;
- PR merged → `Done`;
- failed gate → create correction issues, do not reopen completed child implementation without reason.
