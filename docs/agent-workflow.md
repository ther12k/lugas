# Agent Workflow

Roles: dispatcher selects dependency-ready issues; task agent works one isolated worktree; integrator resolves shared-file changes; gate reviewer checks merged evidence; owner decides irreversible package/license/publication choices.

Evidence is mandatory for implementation issues. Stable IDs in the OKF backlog remain authoritative over repository issue numbers. Agents stop at issue scope and create correction/blocker issues for failed acceptance criteria rather than weakening tests.
