---
type: Engineering Standard
title: Dependencies, Licensing, and Supply-Chain Controls
status: draft
tags:
- dependencies
- supply-chain
- license
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Dependencies, Licensing, and Supply-Chain Controls

## Dependency policy

- Core production runtime target: zero dependencies.
- Client production runtime target: zero dependencies.
- Testing and CLI dependencies require explicit evidence and may remain development-only.
- Validator libraries are conformance/test dependencies; applications bring their own validator.
- Do not copy implementation from Elysia, Eden, Bun, or another project without license review and attribution.

## Pinning

- Commit `bun.lock`.
- Pin CI Bun version and record upgrade issues.
- Use bounded semver ranges only after compatibility evidence.
- Record direct and transitive licenses before alpha packaging.

## Package audit

M5 reports:

- production/dev dependency graph;
- license inventory;
- known vulnerabilities and disposition;
- package tarball file list and size;
- Bun build metafile;
- generated SBOM format selected by tooling;
- provenance/checksum process;
- secret scan result.

## Publication controls

- Publication is performed by an owner-controlled workflow or explicit manual approval.
- No agent receives persistent publish credentials.
- Dry-run package contents are reviewed before registry publication.
- Package provenance/signing capabilities are adopted only after verifying current registry/Bun support.
- Release commit/tag and tarball checksum are recorded.

## Vendoring and structural types

If Standard Schema support can be expressed as a small compatible structural type, avoid a runtime import. Any copied interface text must preserve license/attribution requirements. M2-001 records the decision.
