/**
 * Compatibility statement verifier (M6-006; hardened M6-006-EH #294).
 *
 * Guards docs/compatibility.md against drift from reality using STRUCTURED
 * data, not string matching:
 *
 * 1. Workflow matrix: parsed with Bun.YAML; each (os, bun) combination must
 *    map to a declared green cell in the doc's runtime table.
 * 2. Doc table: rows are parsed into cells; every declared combination gets
 *    its own pass-mark binding — extra doc rows for undeclared combos FAIL.
 * 3. Versions: TypeScript and validator versions in the doc must equal the
 *    lockfile-resolved versions from bun.lock (no hard-coded pins here).
 * 4. Bun claims: broad-semver patterns (^, ~, >=, .x, ≥) applied to a Bun
 *    version in the doc are rejected; exact patches only.
 * 5. OS→platform mapping: derived from runner image names with NO silent
 *    fallback — an unknown runner value FAILs rather than meaning Windows.
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

interface WorkflowFile {
  jobs?: {
    test?: {
      strategy?: { matrix?: { os?: string[]; bun?: string[] } };
      steps?: Array<{ run?: string }>;
    };
  };
}

/** Parses a runtime-table row into cells (trim + drop empties). */
function parseRow(line: string): string[] {
  return line.split("|").map((c) => c.trim()).filter((c) => c !== "");
}

function lockResolved(lockText: string, name: string): string | undefined {
  const escaped = name.replace(/\//g, "\\/");
  const m = lockText.match(new RegExp(`"${escaped}":\\s*\\["${escaped}@([^"]+)"`));
  return m?.[1];
}

function main() {
  const doc = readFileSync(resolve(ROOT, "docs", "compatibility.md"), "utf8");
  const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
    devDependencies?: Record<string, string>;
  };
  const lock = readFileSync(resolve(ROOT, "bun.lock"), "utf8");
  const workflowRaw = readFileSync(
    resolve(ROOT, ".github", "workflows", "compatibility.yml"),
    "utf8",
  );

  // ------------------------------------------------------------------
  // 1. Structured workflow matrix via Bun.YAML (#294).
  // ------------------------------------------------------------------
  let workflow: WorkflowFile;
  try {
    workflow = Bun.YAML.parse(workflowRaw) as WorkflowFile;
  } catch (error) {
    check("workflow YAML parses", false, String(error));
    process.exit(1);
  }
  const strategy = workflow.jobs?.test?.strategy?.matrix;
  const oses = strategy?.os ?? [];
  const buns = strategy?.bun ?? [];
  check("workflow declares a 3×2 matrix", oses.length === 3 && buns.length === 2, `${oses.length} OS × ${buns.length} Bun`);

  // Runner-image → platform mapping with no silent fallback (#294).
  const platformOf = (runnerOS: string): "linux" | "macos" | "windows" | null => {
    if (runnerOS.startsWith("ubuntu")) return "linux";
    if (runnerOS.startsWith("macos")) return "macos";
    if (runnerOS.startsWith("windows")) return "windows";
    return null;
  };
  const mappings = new Map(oses.map((o) => [o, platformOf(o)]));
  check(
    "all runner images map to an explicit platform",
    oses.length > 0 && [...mappings.values()].every((v) => v !== null),
    [...mappings.entries()].map(([k, v]) => `${k}→${v ?? "UNKNOWN"}`).join(", "),
  );
  // Arch columns must match what those runners actually are.
  const expectedArchLinux = oses.some((o) => o.startsWith("ubuntu"));
  check(
    "doc Linux column arch matches ubuntu runner (x86-64 documented)",
    !expectedArchLinux || doc.includes("Linux x86-64"),
    "column header",
  );
  const macosArmDocumented = doc.includes("macOS arm64");
  check("doc macOS column documents arm64 arch", macosArmDocumented, "column header");
  const windowsDocumented = doc.includes("Windows x64");
  check("doc Windows column documents x64 arch", windowsDocumented, "column header");

  // Runner metadata archival step present (#294): exact resolved bun version
  // recorded per cell so "latest patch" has a concrete value in evidence.
  const steps = workflow.jobs?.test?.steps ?? [];
  const archiveStep = steps.find((s) => typeof s.run === "string" && s.run.includes("bun --version"));
  check("workflow archives resolved bun --version per cell", archiveStep !== undefined, archiveStep ? "archival step present" : "missing");

  // CLI tests execute per-cell (#294 finding 4): CLI is spawn/timeout-heavy,
  // exactly where platforms differ.
  const cliStep = steps.find((s) => typeof s.run === "string" && s.run.includes("tests/cli"));
  check("workflow runs tests/cli/ in every matrix cell", cliStep !== undefined, cliStep ? (cliStep.run ?? "").trim().split("\n")[0]! : "missing");

  // ------------------------------------------------------------------
  // 2. Doc table: every workflow combo bound to a specific green cell;
  //    undeclared rows FAIL.
  // ------------------------------------------------------------------
  const lines = doc.split("\n");
  // Header row is the table line starting with "| Server core" that also
  // declares the OS columns (runtime matrix header).
  const headerIdx = lines.findIndex(
    (l) => l.startsWith("| Server core") && l.includes("Linux x86-64"),
  );
  if (headerIdx === -1) {
    check("runtime table exists", false, "Server-core matrix header not found");
    process.exit(1);
  }
  const rawRows = lines
    .slice(headerIdx + 2)
    .filter((l) => l.trim().startsWith("|"))
    .map(parseRow)
    .filter((cells) => cells[0] === "Server core");

  // Columns from separator row: ["Bun", "Linux x86-64", ...] etc. Positional:
  // col index 2=linux, 3=macos, 4=windows after the component column.
  const declaredBuns = new Set(buns);
  const IDX = { selector: 1, exact: 2, linux: 3, macos: 4, windows: 5 };
  for (const bun of buns) {
    const row = rawRows.find((cells) => {
      const m = cells[IDX.selector]?.match(/\*\*([^*]+)\*\*/);
      return m?.[1] === bun || cells[IDX.selector]?.startsWith(`**${bun} `);
    });
    if (!row) {
      check(`doc row for Bun ${bun}`, false, "missing from runtime table");
      continue;
    }
    for (const [osRunner, plat] of mappings) {
      if (plat === null) continue;
      const mark = row[IDX[plat]];
      check(`cell ${osRunner}/${bun} green`, mark === "✅", mark ?? "(empty)");
    }
  }
  for (const cells of rawRows) {
    const m = cells[IDX.selector]?.match(/\*\*([^*]+)\*\*/);
    const v = m?.[1];
    if (v && !declaredBuns.has(v)) {
      check(`doc row ${v} matches workflow matrix`, false, `not in [${[...declaredBuns].join(", ")}]`);
    }
  }

  // ------------------------------------------------------------------
  // 3. Exact lock-resolved versions — no hard-coded pins (#294).
  // ------------------------------------------------------------------
  const typescriptLock = lockResolved(lock, "typescript");
  const zodLock = lockResolved(lock, "zod");
  const valibotLock = lockResolved(lock, "valibot");
  const specLock = lockResolved(lock, "@standard-schema/spec");

  check(
    "doc states exact lock-resolved TypeScript",
    typescriptLock !== undefined && doc.includes(typescriptLock),
    typescriptLock ?? "?",
  );
  const rangeZod = pkg.devDependencies?.zod ?? "";
  check(
    "doc states lock-resolved zod",
    zodLock !== undefined && doc.includes(zodLock),
    `${rangeZod} → ${zodLock ?? "?"}`,
  );
  const rangeValibot = pkg.devDependencies?.valibot ?? "";
  check(
    "doc states lock-resolved valibot",
    valibotLock !== undefined && doc.includes(valibotLock),
    `${rangeValibot} → ${valibotLock ?? "?"}`,
  );
  check(
    "doc states Standard Schema contract version",
    specLock !== undefined && doc.includes(specLock),
    specLock ?? "?",
  );

  // ------------------------------------------------------------------
  // 4. Broad-semver Bun claims rejected (widened patterns, #294).
  // ------------------------------------------------------------------
  // Patterns must be Bun-scoped: validator ranges like "^1.4.2" are legal
  // and must not trip the guard. Each pattern either names Bun or is anchored
  // to a bare version token preceded by whitespace/backtick after "Bun".
  const broadPatterns: RegExp[] = [
    /\bBun\s*[≥>=]+\s*1\b/,
    /Bun\s*\^1/,
    /Bun\s*~1/,
    /(?<!Valibot.{0,20})(?<!Zod.{0,20})[\s|`*]\^[1-9]\.4\b(?!\.\d)/,
    /(?<!Valibot.{0,20})[\s|`*]~[1-9]\.4\b(?!\.\d)/,
    /Bun\s+1\.x/,
    /\bbun@?\s?1\.x\b/i,
    /supports Bun 1(?![.]\d)/,
  ];
  const broadHits = broadPatterns.filter((re) => re.test(doc)).length;
  check("no broad semver Bun claims", broadHits === 0, `${broadHits} pattern hit(s)`);

  // "1.4.x" may appear only annotated with "patch"/"latest" (selector usage),
  // never as a standalone support claim.
  const standalone14x = (doc.match(/1\.4\.x/g) ?? []).length;
  const annotated14x = (doc.match(/1\.4\.x[^a-zA-Z]{0,3}(patch|latest)/g) ?? []).length;
  check(
    "'1.4.x' appears only as an annotated selector",
    standalone14x === annotated14x,
    `${standalone14x} occurrence(s), annotated: ${annotated14x}`,
  );

  if (failures > 0) {
    console.error(`\nFAIL: ${failures} compatibility-doc mismatch(es)`);
    process.exit(1);
  }
  console.log("\nverify:compatibility-report PASS");
}

main();
