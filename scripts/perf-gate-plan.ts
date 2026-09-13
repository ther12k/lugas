/**
 * Perf-gate invocation plan for the verify wrapper (CA-13).
 *
 * The release skip hole: the wrapper previously invoked the checker only
 * when the plain benchmark archive existed, examining LUGAS_PERF_RELEASE
 * inside that condition — so `LUGAS_PERF_RELEASE=1` with no archive
 * recorded SKIP and verify could exit 0. The checker itself fails closed in
 * `--release` mode (missing/stale evidence FAILs); the wrapper must ask it.
 *
 * Truth table (pinned by tests/unit/verify-perf-gate.test.ts):
 * - development, no archives        → SKIP (documented, allowed)
 * - release, no archives            → run --release (checker fails closed)
 * - release, stale archives         → run --release (checker fails closed)
 * - release, current complete       → run --release (checks decide)
 * - development, archive present    → run (development-mode checks)
 */

export type PerfGatePlan =
  | { readonly run: true; readonly argv: readonly string[] }
  | { readonly run: false; readonly skipReason: string };

export function resolvePerfGatePlan(options: {
  readonly release: boolean;
  readonly hasPlainArchive: boolean;
}): PerfGatePlan {
  if (options.release) {
    return { run: true, argv: ["--release"] };
  }
  if (options.hasPlainArchive) {
    return { run: true, argv: [] };
  }
  return {
    run: false,
    skipReason: "no benchmark results archive — run benchmarks before release gate (development mode)",
  };
}
