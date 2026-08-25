# Beta Compatibility Policy

## Scope

This policy applies to the public API surface exported from `lugas`,
`lugas/client`, and `lugas/testing`.

## Rules

1. **Breaking changes** require: ADR + migration note + minor version bump.
2. **Additive changes** are allowed in any release.
3. **Removals** require one minor release with deprecation warning first.
4. **Diagnostic codes** are frozen; message wording may evolve.

## Bun compatibility

Lugas pins Bun 1.4.x. Patch updates within 1.4.x do not require re-review.
Bun 1.5+ requires an ADR and full test suite rerun.
