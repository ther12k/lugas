---
type: Knowledge Bundle Guide
title: LugasJS Framework Design and Subagent Delivery Bundle
status: draft
tags:
- lugasjs
- bun
- typescript
- okf
- architecture
- agent-handoff
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
description: Canonical entry point for the LugasJS design, governance, and GitHub-ready subagent backlog.
---

# LugasJS Framework Design and Subagent Delivery Bundle

This bundle is the design baseline and executable delivery plan for **LugasJS**: a small, explicit, Bun-native TypeScript framework for humans and coding agents.

> **Positioning:** raw `Bun.serve` with the missing structure—typed routes, optional validation, typed guards, predictable errors, an explicit end-to-end client, testing helpers, and deterministic inspection—without recreating Elysia's full framework surface.

## Trust boundary

Every design concept is `draft` unless an ADR explicitly says otherwise. Normative words such as **MUST**, **SHOULD**, and **MAY** describe the proposed contract; they do not claim implementation. Performance figures are budgets or hypotheses until reproducible evidence closes the corresponding issue.

The package follows an OKF v0.2-style Markdown knowledge bundle:

- the root [`index.md`](index.md) declares the OKF version;
- reserved `index.md` and `log.md` files organize concepts;
- non-reserved Markdown files use YAML frontmatter with a non-empty `type`;
- internal links, issue dependencies, and the ZIP are locally validated;
- local validation is not external certification.

## Recommended review order

1. [Project Charter](project/charter.md)
2. [Product Vision and Success](project/vision-and-success.md)
3. [Design Principles](project/principles.md)
4. [Scope and Non-Goals](project/scope-and-non-goals.md)
5. [Architecture Overview](architecture/overview.md)
6. [Public API](architecture/public-api.md)
7. [Route Contract](architecture/route-contract.md)
8. [Schema and Validation](architecture/schema-and-validation.md)
9. [Typed Client](architecture/typed-client.md)
10. [Security and Threat Model](engineering/security-and-threat-model.md)
11. [Roadmap](delivery/roadmap.md)
12. [Dependency Graph](delivery/dependency-graph.md)
13. [Subagent Worktree Protocol](engineering/subagent-worktree-protocol.md)
14. [Issue Index](delivery/issue-index.md)
15. [Architecture Decisions](decisions/index.md)

## Bundle structure

| Directory | Purpose |
|---|---|
| `project/` | Product purpose, users, requirements, scope, naming, and governance |
| `architecture/` | Proposed runtime, API, type, validation, client, manifest, and packaging contracts |
| `engineering/` | Coding, security, testing, performance, CI, compatibility, and agent standards |
| `delivery/` | Milestones, dependency DAG, parallel waves, traceability, gates, risks, and issue operations |
| `decisions/` | Consequential decisions with alternatives and consequences |
| `issues/` | One GitHub-ready task per Markdown file, including dependencies and worktree boundaries |
| `templates/` | Reusable ADR, issue, evidence, spike, benchmark, security, gate, and release templates |
| `github/` | Pull-request, review, issue-import, labels, and CODEOWNERS planning |
| `references/` | Bun, Elysia 2, Eden, Standard Schema, RFC 9457, OKF, and design-session notes |
| `reports/` | Expected implementation evidence locations and reporting rules |

## Core decisions in one page

- Bun is the only runtime target for 0.x.
- Bun owns HTTP serving and route matching; Lugas composes routes once at startup.
- The canonical API is object-based and keeps full path, method, schema, guards, and handler together.
- Handlers receive native web objects and return native `Response` objects.
- Typed helper responses carry compile-time status/body information through a phantom type only.
- Standard Schema validation is optional; the core targets zero production runtime dependencies.
- Guards are named, ordered, explicit, and may enrich context or short-circuit with a response.
- The first typed client is explicit fetch-style, not a Proxy tree and not an Eden dependency.
- HTTP errors are discriminated results; network and abort failures retain normal `fetch` throwing behavior.
- Runtime manifests expose only information truly present at runtime.
- OpenAPI, WebSocket abstraction, ORM, authentication product, multi-runtime adapters, and an AOT compiler are outside v0.1.

## Delivery model

The backlog contains small, dependency-aware issues grouped into M0–M6. A task is agent-ready only when its dependencies are merged, its file ownership does not conflict with active work, and no owner decision blocks it. Each task uses one worktree and produces an evidence report. Gate issues create merge barriers between milestones.

Use [MASTER_AGENT_PROMPT.md](MASTER_AGENT_PROMPT.md) to start implementation and [AGENTS.md](AGENTS.md) as the standing repository policy.

## Archive integrity

- [Manifest](MANIFEST.md)
- [SHA-256 content checksums](SHA256SUMS.md)
- [Local structural validation](VALIDATION.md)
- [Bundle report](bundle-report.md)
