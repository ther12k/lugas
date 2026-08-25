# Lugas Private Alpha Release Packet

Commit: f24373b
Generated: 2026-08-25T06:36:45.890Z
Bun: 1.4.0

## Evidence Index

### Gate reports
- docs/reports/gates/M0.md
- docs/reports/gates/M1.md
- docs/reports/gates/M2.md
- docs/reports/gates/M3.md
- docs/reports/gates/M4.md
- docs/reports/gates/M4R1-GATE.md

### Issue evidence reports
- docs/reports/issues/M0-001.md
- docs/reports/issues/M0-002.md
- docs/reports/issues/M0-003.md
- docs/reports/issues/M0-004.md
- docs/reports/issues/M0-005.md
- docs/reports/issues/M0-006.md
- docs/reports/issues/M0-007.md
- docs/reports/issues/M0-008.md
- docs/reports/issues/M0-009.md
- docs/reports/issues/M0-010.md
- docs/reports/issues/M0-011.md
- docs/reports/issues/M1-001.md
- docs/reports/issues/M1-002.md
- docs/reports/issues/M1-003.md
- docs/reports/issues/M1-004.md
- docs/reports/issues/M1-005.md
- docs/reports/issues/M1-006.md
- docs/reports/issues/M1-007.md
- docs/reports/issues/M1-008.md
- docs/reports/issues/M1-009.md
- docs/reports/issues/M1-010.md
- docs/reports/issues/M1-011.md
- docs/reports/issues/M1-012.md
- docs/reports/issues/M1-013.md
- docs/reports/issues/M1-014.md
- docs/reports/issues/M1-015.md
- docs/reports/issues/M1-016.md
- docs/reports/issues/M1-017.md
- docs/reports/issues/M1-018.md
- docs/reports/issues/M1-GATE.md
- docs/reports/issues/M2-001.md
- docs/reports/issues/M2-002.md
- docs/reports/issues/M2-003.md
- docs/reports/issues/M2-004.md
- docs/reports/issues/M2-005.md
- docs/reports/issues/M2-006.md
- docs/reports/issues/M2-007.md
- docs/reports/issues/M2-008.md
- docs/reports/issues/M2-009.md
- docs/reports/issues/M2-010.md
- docs/reports/issues/M2-011.md
- docs/reports/issues/M2-012.md
- docs/reports/issues/M2-013.md
- docs/reports/issues/M2-014.md
- docs/reports/issues/M2-015.md
- docs/reports/issues/M2-016.md
- docs/reports/issues/M2-017.md
- docs/reports/issues/M2-018.md
- docs/reports/issues/M2-GATE.md
- docs/reports/issues/M3-001.md
- docs/reports/issues/M3-002.md
- docs/reports/issues/M3-003.md
- docs/reports/issues/M3-004.md
- docs/reports/issues/M3-005.md
- docs/reports/issues/M3-006.md
- docs/reports/issues/M3-007.md
- docs/reports/issues/M3-008.md
- docs/reports/issues/M3-009.md
- docs/reports/issues/M3-010.md
- docs/reports/issues/M3-011.md
- docs/reports/issues/M3-012.md
- docs/reports/issues/M3-013.md
- docs/reports/issues/M3-014.md
- docs/reports/issues/M3-015.md
- docs/reports/issues/M3-016.md
- docs/reports/issues/M3-017.md
- docs/reports/issues/M3-018.md
- docs/reports/issues/M3-GATE.md
- docs/reports/issues/M4-001.md
- docs/reports/issues/M4-002.md
- docs/reports/issues/M4-003.md
- docs/reports/issues/M4-004.md
- docs/reports/issues/M4-005.md
- docs/reports/issues/M4-006.md
- docs/reports/issues/M4-007.md
- docs/reports/issues/M4-008.md
- docs/reports/issues/M4-009.md
- docs/reports/issues/M4-011.md
- docs/reports/issues/M4-012.md
- docs/reports/issues/M4-013.md
- docs/reports/issues/M4-014.md
- docs/reports/issues/M4-015.md
- docs/reports/issues/M4-016.md
- docs/reports/issues/M4-017.md
- docs/reports/issues/M4-GATE.md
- docs/reports/issues/M4R1-001.md
- docs/reports/issues/M4R1-002.md
- docs/reports/issues/M4R1-003.md
- docs/reports/issues/M4R1-004.md
- docs/reports/issues/M4R1-005.md
- docs/reports/issues/M4R1-006.md
- docs/reports/issues/M4R1-007.md
- docs/reports/issues/M4R1-008.md
- docs/reports/issues/M4R1-009.md
- docs/reports/issues/M4R1-GATE.md
- docs/reports/issues/M5-001.md
- docs/reports/issues/M5-002.md
- docs/reports/issues/M5-003.md
- docs/reports/issues/M5-004.md
- docs/reports/issues/M5-005.md
- docs/reports/issues/M5-006.md
- docs/reports/issues/M5-007.md
- docs/reports/issues/M5-008.md
- docs/reports/issues/M5-009.md
- docs/reports/issues/M5-011.md
- docs/reports/issues/M5-012.md
- docs/reports/issues/M5-013.md
- docs/reports/issues/M5-014.md
- docs/reports/issues/M5-015.md
- docs/reports/issues/M5R1.md

## Compatibility Summary

Linux x86-64 verified. macOS/Windows untested.
Bun 1.4.x required; TypeScript 7.0.2.

## Performance Summary

Environment: See docs/reports/m5-plain-performance.md, m5-validation-performance.md, m5-client-type-size.md
Detailed reports: docs/reports/m5-*-performance.md

## Security Summary

Security review: docs/reports/m5-security-review.md
Zero P0/P1 findings open.

## Open Limitations

- macOS/Windows untested (Linux x86-64 only)
- .d.ts declarations deferred to release tooling
- Opaque browser redirects not exercised
- In-flight handler work NOT cancelled on client disconnect
- {dir} entries require real filesystem path

## Alpha Stop Point

This packet marks the end of the private alpha milestone (M5).
No registry publication or public repository action has occurred.
Next step: M6 beta preparation requires owner decisions on
package ownership, license, and governance.
