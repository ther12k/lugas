/**
 * Bun 1.4 development/release baseline check (M5R1-006, M5R1 correction).
 *
 * Pure assertion function — testable without process.exit().
 * Called by verify.ts as the first step.
 */
export function assertSupportedBunVersion(version: string): void {
  const parts = version.split(".").map(Number);
  const major = parts[0] ?? 0;
  const minor = parts[1] ?? 0;
  if (major !== 1 || minor !== 4) {
    throw new Error(
      `Lugas requires Bun 1.4.x; current version is ${version}. ` +
      `Bun-native semantics are part of the Lugas contract.`,
    );
  }
}

export function checkBunVersion(): void {
  try {
    assertSupportedBunVersion(Bun.version);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
