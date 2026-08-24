/**
 * Simple runner: imports each fixture and reports outcome.
 * Usage: bun run spikes/cli-import/run.ts
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");

for (const file of readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".ts")).sort()) {
  const start = Date.now();
  try {
    await import(join(FIXTURES_DIR, file));
    console.log(`${file.padEnd(24)} OK  ${Date.now() - start}ms`);
  } catch (error) {
    console.log(`${file.padEnd(24)} ERR ${Date.now() - start}ms ${(error as Error).message}`);
  }
}
