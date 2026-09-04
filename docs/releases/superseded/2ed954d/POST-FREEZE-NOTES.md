# Post-freeze repository notes

**Status: informational only — does not modify the attested artifact.**

The attested `v0.1.0-beta.1` candidate is frozen at `packageSourceCommit` = `attestationCommit` = `2ed954deb648cdb8e40d7b05e6c0cb0d116f050b`. Everything under this directory (including the tarball `lugas-0.1.0-beta.1.tgz`, `SHA256SUMS`, and `release-evidence.json`) belongs to that artifact and must not be rebuilt or modified under the existing attestation.

The repository's top-level `README.md` has been redesigned **after** the candidate freeze:

- `47c122f` — attestation ledger entry
- `7edb841` — comprehensive README spec (683 lines)
- this restructure — README cut to a public front door with content moved to `docs/` pages, plus community files and the documentation site

Consequently the tarball's npm README is the version frozen at `2ed954d`, not the current repository README. Per the release-integrity rule, exactly one of two owner decisions applies:

1. **Publish the exact existing tarball unchanged**, accepting that its npm README is the earlier frozen version; or
2. **Intentionally create a new candidate** (new freeze commit) and re-attest it with the redesigned README.

The existing tarball must **not** be rebuilt under the same attestation. Either path follows [`CHECKLIST.md`](./CHECKLIST.md); publication remains an explicit owner action.
