# M6R2-C Evidence — Publication rehearsal integrity (metadata, staging, CLI, SBOM)

## Baseline
- Base commit: `252029a` (main, benchmark-validity merged)
- Issues: #278 (publishable metadata + dry-run proof), #283 (real CLI consumer), #284 (provenance binding), #285 (derived SBOM)
- Bun/npm: 1.4.0 / 11.6.1, linux-x64

## Outcome

Completed. The rehearsal now proves publishability rather than assuming it:

- **Publishable candidate (#278)**: staged copy drops `private`, sets
  `publishConfig.access: "public"`, adds a `bin` mapping, and the EXACT
  documented command is executed with `--dry-run --tag beta` against the
  emitted tarball (exit 0 on npm 11.6.1). Real publication differs only by
  dropping `--dry-run`. Empirical honesty note: npm 11.6.1 does not enforce
  `private` even in dry-run; the metadata fix removes ambiguity for all
  tooling versions and the dry-run now genuinely exercises resolution.
- **Real CLI consumer (#283)**: dead probes removed; `lugas routes <fixture>`
  executes through the actual `.bin/lugas` link created by `bun install` from
  the staged tarball (bun shebang added to src/cli/main.ts). Consumer test
  suite gains the same execution; export-freeze check renamed truthfully.
- **Candidate binding (#284)**: rehearsal refuses a dirty tracked tree and
  stages exclusively from `git archive HEAD`; provenance v1 records commit,
  git tree hash, npm version, bun version, platform, staging method.
- **Derived SBOM (#285)**: production dependencies derived from staged
  `dependencies/optionalDependencies/peerDependencies`; zero-dep assertion is
  now computed, not hardcoded.
- **README truthfulness**: stale "nothing is implemented" status replaced.

Final clean-tree run: **15/15 checks**.

## Files changed
- `scripts/release/package-beta.ts` — owned: stages 0/1 rework, metadata transform, publish dry-run stage, real CLI consumer, derived SBOM, provenance v1.
- `src/cli/main.ts` — adjacent (one line): `#!/usr/bin/env bun` shebang enabling bin execution.
- `tests/release/package-consumers/consumers.test.ts` — owned: aligned stager, real-CLI test.
- `README.md`, `docs/reports/m6-package-rehearsal.md` — truthful content updates.
- `docs/releases/beta/*` — regenerated artifacts (tarball stays gitignored).
- `docs/reports/issues/M6R2-C.md` — this evidence report.

## Acceptance mapping

| Criterion | Evidence | Result |
|---|---|---|
| Staged metadata publishable | private dropped + publishConfig + bin in staged pkg.json | pass |
| Exact command validated non-publishing | `npm publish <tgz> --dry-run --access public --tag beta` exit 0 | pass |
| CLI actually executed from installed tarball | rehearsal check "route table rendered" + consumer test exit 0 with manifest output | pass |
| No dead probes | leakProbe/probe2 deleted | pass |
| Provenance binds committed tree | dirty-tree refusal live-tested (blocked its own WIP); git-archive staging check green; tree hash recorded | pass |
| SBOM derived not asserted | derivation source recorded in sbom.json | pass |

## Exact commands and results
```text
git stash && bun run release:package:rehearse   # old code passes on clean tree
# ...with WIP present, new gate refused (✗ dirty) — gate proven live
bun run release:package:rehearse                # 15/15 ✓, exit 0
bun test tests/release/package-consumers/consumers.test.ts   # 6 pass
bun run verify                                  # exit 0
```

## Security considerations
No registry mutation at any point (`--dry-run` only). Dirty-tree refusal
prevents uncommitted local edits from entering release claims.

## Known limitations / deferred
Real `npm publish` remains owner-gated (#109/#110/#116). Full Apache license
text completion belongs to #110.

## Working-tree state
Clean at handoff.
