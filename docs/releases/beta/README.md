# ⛔ DO NOT PUBLISH — active beta release path is intentionally EMPTY

**M6R6-ATT FINAL ATTESTATION PENDING (#309). No artifact in or absent from
this directory is publishable. Any historical release bytes live in
`docs/releases/history/`, never here.**

This directory is the active publication path. It is kept empty of
publishable-looking artifacts until the quiet-host final attestation
succeeds end-to-end (benchmarks → package rehearsal → release verification
→ packet assembly → clean-checkout checksum verification), per the
procedure in `docs/reports/gates/M6.md` (M6R6 addendum).

Until that run completes and the owner executes the regenerated
`CHECKLIST.md`:

- there is **no** releasable tarball here — do not mistake any artifact in
  `docs/releases/history/` for the current candidate;
- any `release-evidence.json` / `package-rehearsal.json` that appears here
  during an attestation run is uncommitted working evidence until committed
  as part of the attestation record;
- publication requires explicit owner approval (M6-010 / M6-GATE).
