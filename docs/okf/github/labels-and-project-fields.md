---
type: Operations Guide
title: GitHub Labels and Project Fields
status: draft
tags:
- github
- labels
- project
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# GitHub Labels and Project Fields

## Labels

### Type

`type:implementation`, `type:spike`, `type:test`, `type:docs`, `type:integration`, `type:gate`, `type:security`, `type:benchmark`, `type:release`.

### Area

`area:architecture`, `area:core`, `area:routing`, `area:responses`, `area:validation`, `area:guards`, `area:types`, `area:client`, `area:manifest`, `area:testing`, `area:cli`, `area:docs`, `area:ci`, `area:security`, `area:performance`, `area:packaging`, `area:release`.

### Priority/size/status

`priority:p0`, `priority:p1`, `priority:p2`; `size:s`, `size:m`, `size:l`; `agent-ready`, `blocked`, `needs-design`, `owner-decision`, `worktree-active`, `correction`.

## Project fields

| Field | Values |
|---|---|
| Stable ID | text |
| Milestone | M0–M6 |
| Wave | generated integer |
| Status | Backlog, Blocked, Ready, Active, Review, Gate review, Done |
| Area | single select |
| Kind | single select |
| Priority | P0/P1/P2 |
| Size | S/M/L |
| Depends on | text/linked issues |
| Conflict group | text |
| Worktree | text |
| Base commit | text |
| Evidence | URL |

## Color policy

Use consistent colors by label family, not one unique color per label. Label meaning matters more than decoration.
