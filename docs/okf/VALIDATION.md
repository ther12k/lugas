---
type: Validation Report
title: LugasJS OKF Local Validation
status: stable
tags:
- validation
- okf
- pass
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS OKF Local Validation

**Result: PASS**

This is a local structural and consistency check of the generated documentation archive. It is not certification, implementation verification, security approval, or endorsement by Google, Bun, Elysia, or another third party.

## Checks passed

- Every archive entry is Markdown.
- Root `index.md` contains only `okf_version: "0.2"` in frontmatter.
- Reserved `index.md` and `log.md` files follow the reserved-file rule.
- Every non-reserved concept has parseable YAML frontmatter, non-empty `type`, recognized status, and generation provenance.
- Every internal Markdown link resolves inside the bundle.
- All 116 task IDs are unique and represented by one issue file.
- All task dependencies exist, `depends_on`/`blocks` relationships agree, and the graph is acyclic.
- Every M1–M6 task transitively crosses the predecessor milestone gate.
- Every issue contains source documents, dependency contract, worktree boundary, owned/protected files, implementation sequence, acceptance checklist, verification, evidence, rollback, and stop point.
- Generated issue index and backlog cover every stable issue ID.
- ZIP validation is performed after packaging and reported outside the archive because embedding its own archive hash would be circular.

## Validated metrics

| Metric | Value |
|---|---:|
| Markdown files | 247 |
| GitHub task/gate issue files | 116 |
| Milestone gate issues | 7 |
| Dependency edges | 369 |
| Longest global execution wave | 46 |
| Internal links checked | 2750 |
| Errors | 0 |
| Warnings | 0 |

## Integrity scope

- Non-control content files: 243
- Non-control UTF-8 bytes: 1,158,591
- Non-control body words: 123,716
- Canonical non-control tree SHA-256: `b30b2028b7d6b5afba826800c4a185aaf8803dbef36e790502c5febad8e04ba2`
- Per-file content checksums: [SHA256SUMS.md](SHA256SUMS.md)
