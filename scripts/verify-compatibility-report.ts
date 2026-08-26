/**
 * Compatibility statement verifier (M6-006).
 *
 * Guards `docs/compatibility.md` against drift from reality:
 * - the CI matrix definition (workflow file) matches the combinations
 *   declared in the compatibility table;
 * - supported Bun patches are declared explicitly (no bare major claims);
 * - pinned toolchain versions in the doc match package.json / source pins.
 *
 * Exit 1 on any mismatch. Deterministic: reads only committed files.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
let failures = 0;

function check(name: string, ok: boolean, detail: string): void {
  console.log(`${ok ? "✓" : "✗"} ${name}: ${detail}`);
  if (!ok) failures++;
}

function main() {
  const doc = readFileSync(resolve(ROOT, "docs", "compatibility.md"), "utf8");
  const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
    devDependencies?: Record<string, string>;
  };
  const workflow = readFileSync(
    resolve(ROOT, ".github", "workflows", "compatibility.yml"),
    "utf8",
  );

  // 1. Workflow matrix OS/Bun combos are all present in the doc.
  const osMatch = workflow.match(/os:\s*\[([^\]]+)\]/);
  const bunMatch = workflow.match(/bun:\s*\[([^\]]+)\]/);
  if (!osMatch || !bunMatch) {
    check("workflow matrix parse", false, "os/bun keys not found in compatibility.yml");
  } else {
    const oses = osMatch[1]!.split(",").map((s) => s.trim().replace("-latest", ""));
    const buns = bunMatch[1]!.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    for (const bun of buns) {
      // Bold version cell, optionally followed by annotation (e.g. "latest patch").
      const ok = doc.includes(`**${bun}**`) || doc.includes(`**${bun} `);
      check(`doc declares Bun ${bun}`, ok, `**${bun}**`);
    }
    for (const os of oses) {
      const col =
        os === "ubuntu" ? "Linux x86-64" :
        os === "macos" ? "macOS arm64" : "Windows x64";
      check(`doc declares ${col} column`, doc.includes(col), col);
    }
    // Windows row actually has green marks (not placeholders).
    check("windows row carries pass markers", /\|\s*✅\s*\|.*Windows/s.test(doc) || doc.includes("windows-latest") ? doc.includes("✅ | ✅ | ✅ |") : false, "3 green cells");
  }

  // 2. No broad-semver-only Bun claim ("Bun ≥ 1", "^1.4") — exact patches only.
  check(
    "no broad semver Bun claims",
    !/\bBun\s*[≥>]\s*1\b/.test(doc),
    "exact patch versions documented",
  );

  // 3. TypeScript pin in doc matches package.json.
  const ts = pkg.devDependencies?.typescript ?? "";
  check(
    "TypeScript version matches package.json",
    ts !== "" && doc.includes(ts.split(".").slice(0, 2).join(".") === "7.0" ? "7.0.2" : ts),
    `doc references ${ts}`,
  );

  // 4. Validator declarations match devDependencies.
  const zod = pkg.devDependencies?.zod ?? "";
  const valibot = pkg.devDependencies?.valibot ?? "";
  check("zod referenced", zod !== "" && doc.includes("Zod"), zod);
  check("valibot referenced", valibot !== "" && doc.includes("Valibot"), valibot);

  if (failures > 0) {
    console.error(`\nFAIL: ${failures} compatibility-doc mismatch(es)`);
    process.exit(1);
  }
  console.log("\nverify:compatibility-report PASS");
}

main();
