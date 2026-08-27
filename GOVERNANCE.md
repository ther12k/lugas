# Project Governance

## 1. Project Roles & Authority

- **Lead Maintainer / BDFL:** Rizky Zulkarnaen (`@ther12k`)
  - Ultimate authority over architecture, breaking changes, license, releases, and security advisories.
- **Maintainers & Contributors:**
  - Authority over code review, PR approvals, issue triage, and documentation.
- **AI & Autonomous Agents:**
  - Subject to repository agent instructions in `AGENTS.md` and worktree protocol. Autonomous actions are limited to scoped worktrees with verify gate enforcement; publication and license decisions require explicit owner sign-off.

## 2. Decision Making & ADR Process

- **Architecture Decisions:** Major architectural changes require an accepted Architecture Decision Record (ADR) in `docs/okf/decisions/`.
- **Release Gating:** Every release milestone must satisfy its corresponding release gate criteria defined in `docs/okf/delivery/release-gates.md`.

## 3. Contribution Workflow

- All contributions proceed via GitHub Pull Requests.
- CI quality gates (`bun run verify` and `.github/workflows/compatibility.yml`) must pass before merge.
- Worktrees follow one-issue-per-branch isolation per `AGENTS.md`.

## 4. Release Authority

- Release tags and package publication to npm or registry targets are exclusively authorized by the Lead Maintainer.
- Pre-release candidates undergo package rehearsal and clean-room validation before promotion.
