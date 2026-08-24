/**
 * Syncs the generated framework-version constant with package.json (M4R1-008,
 * ADR-0017 #7). Run after a version bump: `bun scripts/sync-version.ts`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const pkg = JSON.parse(readFileSync(resolve(import.meta.dir, "../package.json"), "utf8")) as { version?: string };
const version = pkg.version ?? "0.0.0";
const target = resolve(import.meta.dir, "../src/internal/framework-version.ts");
const contents = `/** Generated build constant — synced from package.json by scripts/sync-version.ts. Do not edit by hand. */\nexport const FRAMEWORK_VERSION = ${JSON.stringify(version)};\n`;
writeFileSync(target, contents);
console.log(`framework-version.ts synced to ${version}`);
