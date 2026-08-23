/**
 * Client dependency-graph inspector (M3-014).
 *
 * Scans every module under `src/client/**` and asserts the browser-safety
 * contract at source level:
 * - no runtime (non-type-only) import/re-export may leave `src/client/**`;
 *   server types must be imported through explicit `import type`,
 *   `export type`, or all-`type`-prefixed named clauses, which the compiler
 *   erases at runtime;
 * - inline type-position references (`… extends import("mod").Type`) are
 *   compile-time-only by grammar and therefore allowed;
 * - genuine dynamic `import("…")` calls are treated as runtime edges;
 * - no specifier may target `bun`, a `node:` builtin, or testing/CLI entries,
 *   including type-only positions.
 *
 * Usage: bun run scripts/check-client-graph.ts
 * Exits 1 with a violation list on failure. This script is the canonical
 * implementation behind the planned `bundle:client:inspect` package script.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const CLIENT_ROOT = resolve(import.meta.dir, "../src/client");

type Violation = { file: string; specifier: string; reason: string };

function* walkTs(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walkTs(full);
      continue;
    }
    if (entry.endsWith(".ts")) {
      yield full;
    }
  }
}

const FORBIDDEN_SPECIFIERS = ["bun", "node:", "src/testing", "src/cli"];

const violations: Violation[] = [];

function isAllTypesClause(clause: string | undefined): boolean {
  if (clause === undefined || clause.trim() === "") {
    return false;
  }
  const inner = clause.trim().replace(/^\{/, "").replace(/\}$/, "");
  const parts = inner.split(",").map((part) => part.trim()).filter((p) => p !== "" && p !== "type");
  return parts.length > 0 && parts.every((part) => part.startsWith("type "));
}

for (const file of walkTs(CLIENT_ROOT)) {
  const source = readFileSync(file, "utf8");

  // Type-position inline references: `extends import("mod").Type`.
  const inlineTypeSpans: Array<[number, number]> = [];
  for (const match of source.matchAll(/extends\s+import\(\s*["']([^"']+)["']\s*\)/g)) {
    const idx = match.index ?? 0;
    inlineTypeSpans.push([idx, idx + match[0].length]);
  }

  // Static import/export statements, possibly multi-line clauses.
  for (const match of source.matchAll(
    /\b(import|export)\b\s*(type\b)?([\s\S]*?)\bfrom\s*["']([^"']+)["']/g,
  )) {
    const kind = match[1]!;
    const explicitType = match[2] === "type";
    const clause = match[3];
    const specifier = match[4]!;

    for (const forbidden of FORBIDDEN_SPECIFIERS) {
      if (specifier === forbidden || specifier.startsWith(forbidden)) {
        violations.push({ file, specifier, reason: "forbidden module specifier" });
      }
    }

    if (!specifier.startsWith(".")) {
      continue;
    }
    const runtime =
      kind === "export"
        ? !explicitType && !isAllTypesClause(clause)
        : !(explicitType || isAllTypesClause(clause));
    if (runtime) {
      const target = resolve(file, "..", specifier);
      if (!target.startsWith(CLIENT_ROOT)) {
        violations.push({ file, specifier, reason: "runtime import escapes src/client" });
      }
    }
  }

  // Dynamic imports: anything not in an inline-type span is a runtime edge.
  for (const match of source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (inlineTypeSpans.some(([s, e]) => start >= s && end <= e)) {
      continue;
    }
    const specifier = match[1]!;
    for (const forbidden of FORBIDDEN_SPECIFIERS) {
      if (specifier === forbidden || specifier.startsWith(forbidden)) {
        violations.push({ file, specifier, reason: "forbidden dynamic import" });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("CLIENT-GRAPH-FAIL");
  for (const v of violations) {
    console.error(`  ${v.file}: '${v.specifier}' — ${v.reason}`);
  }
  process.exit(1);
}
console.log("CLIENT-GRAPH-OK: all src/client modules are browser-safe at source level");
