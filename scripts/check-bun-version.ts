/**
 * Bun 1.4 development/release baseline check (M5R1-006).
 *
 * Runs during `bun run verify`, CLI tooling, and release checks —
 * never in the request hot path.
 */
export function checkBunVersion(): void {
  const [major, minor] = Bun.version.split(".").map(Number);
  if (major !== 1 || minor !== 4) {
    console.error(
      `Lugas requires Bun 1.4.x; current version is ${Bun.version}. ` +
      `Bun-native semantics are part of the Lugas contract.`,
    );
    process.exit(1);
  }
}
