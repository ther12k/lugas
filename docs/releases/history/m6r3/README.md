# Frozen release record — M6R3 era (SUPERSEDED — DO NOT PUBLISH)

This directory is a frozen audit record of the M6R3-era beta rehearsal
artifacts, moved out of the active publication path in M6R6 (#308).

**Nothing in this directory may be published.** The tarball, inventory,
provenance, SBOM, packet, and checklist below describe a superseded
candidate and are kept only as history.

| Fact | Value |
|---|---|
| Provenance source commit | `d2a07b213bc719097c88340a177e68737aa10301` |
| Tarball sha256 | `347f11c2c00b9790811cefa7b36462da80aaabdd543b4beb79617d1d3326205d` |
| Inventory entries | 69 (predates the `NOTICE` packaging addition — final packages must include it) |
| Checklist vintage | publish-first ordering, candidate `34439dc…`, "15/15" rehearsal — all superseded |

`SHA256SUMS` in this directory covers exactly the files stored beside it and
still verifies from inside this directory:

```bash
( cd docs/releases/history/m6r3 && sha256sum --check SHA256SUMS )
```

Why these files are not simply deleted: they are the rehearsal evidence the
M6 gate reports refer to when describing the M6R3/M6R4 correction waves.
Deleting published-history evidence would break those references.

The active publication path is `docs/releases/beta/`. It stays empty of
publishable-looking artifacts until the quiet-host final attestation
(M6R6-ATT, #309) succeeds; see `docs/releases/beta/README.md`.
