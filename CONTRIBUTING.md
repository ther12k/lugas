# Contributing to Lugas

Lugas is entering its external-validation phase. The highest-value contributions are real applications built from the published package, documentation feedback, type-inference reproductions, cross-platform reports, browser-client verification, integration proposals with narrow testable contracts, production-shaped examples, and security/failure-mode reviews.

## Setup

```bash
git clone https://github.com/ther12k/lugas.git
cd lugas
bun install
bun run verify  # bun-version + typecheck + test + docs + diff
```

Toolchain: [Bun](https://bun.sh) 1.4.x and TypeScript 7.0.2 (pinned devDependency). The full gate is defined in `scripts/verify.ts`; see also [`docs/performance-gates.md`](docs/performance-gates.md) for the benchmark budgets that apply to release work.

## Workflow

1. Create a worktree for your issue (one issue per branch; see `AGENTS.md`):

   ```bash
   git worktree add .worktrees/<ID> -b agent/<ID>-<slug> main
   cd .worktrees/<ID>
   bun install --frozen-lockfile
   ```

2. Implement the smallest complete solution for the assigned issue. Do not start later-milestone work because nearby code looks useful.
3. Run `bun run verify` before committing — never weaken a test to make it pass.
4. Create an evidence report at `docs/reports/issues/<ID>.md` (baseline, outcome, files changed, assumptions, acceptance mapping, exact commands/results, known limitations, deferred work). Use existing reports as examples.
5. Push and open a PR linking to the issue.

## Constraints

- Public APIs stay small, explicit, object-based, and statically searchable.
- No ORM, auth product, OpenAPI, JSX, WebSocket, or cloud adapter without an accepted ADR.
- No `any` at public boundaries without proof; no comments unless needed.
- Protected files (`package.json`, `bun.lock`, `src/index.ts`, `src/client/index.ts`, `src/testing/index.ts`, `tsconfig*.json`, `.github/workflows/*`) are owned by their assigned issue; if your change needs a pending export there, document it in your evidence report instead of editing.
- Architecture and engineering specs live in [`docs/okf/`](docs/okf/index.md); ADRs in `docs/okf/decisions/` outrank informal preferences.

## Feature proposals

Before opening a large feature pull request, start with an issue describing the user problem, why the capability belongs in Lugas, whether it belongs in core or an optional integration, its effect on the zero-dependency core, the proposed public contract, and its testing/compatibility requirements.

## Community

By participating you agree to the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Release publication is owner-only per [`GOVERNANCE.md`](GOVERNANCE.md).
