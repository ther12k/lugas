/**
 * Single source of truth for the release candidate identity.
 *
 * Three release scripts must agree on one version for a candidate to be
 * coherent: the tarball packager (package-beta.ts), the packet builder
 * (build-beta-packet.ts, which selects and attests the tarball), and the
 * release-mode performance gate (check-performance-budget.ts, which hashes
 * the tarball into release-evidence.json). They previously carried three
 * independent literals — bumping one produced a beta.N tarball with beta.N-1
 * evidence hashes (candidate-prep review, 2026-09-12).
 *
 * Changing this constant IS a candidate-input change: commit it (clean tree)
 * before running the rehearsal, per the release checklist.
 */
export const CANDIDATE_VERSION = "0.1.0-beta.5";
