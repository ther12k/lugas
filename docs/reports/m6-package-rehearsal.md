# M6 Package Publication Rehearsal — Beta Candidate

Milestone: M6 — Beta Stabilization and Release
Issue: #108 (M6-003) / correction #261 (M6R1-006)
Commit: 44805a0 (main, M6R1-011 merged)
Bun: 1.4.0 · TypeScript: 7.0.2 · linux-x64
Generated: 2026-08-26T16:20Z

## Result

REHEARSAL PASSED — 12/12 checks green. The exact beta tarball
(`lugas-0.1.0-beta.1.tgz`, 69 entries) was packed from a staged copy,
installed into three real consumers, and every consumer ran from the
tarball alone. **No publication occurred**; the registry command is
documented below but was not executed.

## Consumer proof

| Consumer | Proof | Result |
|---|---|---|
| Server | `defineApp` + `route` + `json` from `"lugas"`; manifest emitted (`lugas-manifest-v1`) | pass |
| Browser client | `createClient` from `"lugas/client"`, Bun.build browser target, executed under Node with no Bun global | pass |
| Testing | `createTestServer` round-trip from `"lugas/testing"`: HTTP fetch `/hi` → 200 `{hello:"world"}`, idempotent stop | pass |
| Export freeze | installed `node_modules/lugas/package.json` exports exactly `.`, `./client`, `./testing`; version `0.1.0-beta.1` | pass |

Repeatable test suite: `tests/release/package-consumers/consumers.test.ts`
(5 tests, packs fresh each run, skips cleanly if npm is unavailable).

## Artifacts (docs/releases/beta/)

- `lugas-0.1.0-beta.1.tgz` — exact packed tarball (gitignored; regenerable via canonical command)
- `SHA256SUMS` — sha256 over all four artifacts; tarball digest recorded at rehearsal time:
  `9c1f041122ce58682e6be14a9ac4ca424cfbec9107617511e33d2eb87ce725d1`
- `sbom.json` — lugas-sbom-v0; zero production dependencies, 6 dev-scoped
- `provenance.json` — lugas-provenance-v0 bound to commit `44805a0…`,
  `publishedToRegistry: false`
- `inventory.json` — all 69 tarball paths

Content gates on the inventory: no `tests/`, `scripts/release/`,
`benchmarks/`, `.worktrees/`, or `.env` entries; `LICENSE` (Apache-2.0) and
`README.md` present.

## Canonical command

```
bun run release:package:rehearse
```

Added to package.json scripts this issue. Re-running regenerates every
artifact deterministically except the timestamp/provenance fields that embed
generation time by design.

## Publication command (DOCUMENTED, NOT EXECUTED)

```
npm publish ./docs/releases/beta/lugas-0.1.0-beta.1.tgz --access public
```

Execution is gated on owner decisions in #109/#110 and the M6-010/M6-GATE
sequence. The private repo must not be published without explicit owner
approval.

## Known limitations

- Tarball contains `.ts` sources (no build step); declarations are consumed
  as TS directly under Bun/TS-native tooling — consistent with the pre-release
  packaging posture documented in M5.
- Node execution of the server core is out of scope (Bun-only through 1.x).
