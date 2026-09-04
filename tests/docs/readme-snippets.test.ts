/**
 * README snippet drift guard (#328, M6R13).
 *
 * The documentation site builds Markdown without typechecking TypeScript
 * code fences, so a green Pages deployment cannot catch snippet defects.
 * Every ```ts fence in README.md must instead match, verbatim and in order,
 * a fixture file under tests/docs/fixtures/ that the root typecheck
 * compiles against the real public API. Editing a README snippet without
 * updating its fixture (and vice versa) fails here.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const README_PATH = resolve(import.meta.dir, "../../README.md");

/** Fixture files in the exact order their fences must appear in README.md. */
const FIXTURES = [
  "readme-hello/app.ts",
  "readme-hello/server.ts",
  "readme-invoices/app.ts",
  "readme-invoices/client.ts",
] as const;

function extractTsFences(markdown: string): string[] {
  const fences: string[] = [];
  let inFence = false;
  let lang = "";
  let buffer: string[] = [];
  for (const line of markdown.split("\n")) {
    if (!inFence && line.trimStart().startsWith("```")) {
      inFence = true;
      lang = line.trim().slice(3).trim();
      buffer = [];
      continue;
    }
    if (inFence && line.trim() === "```") {
      inFence = false;
      if (lang === "ts") fences.push(buffer.join("\n"));
      continue;
    }
    if (inFence) buffer.push(line);
  }
  return fences;
}

describe("README snippet fixtures", () => {
  const fences = extractTsFences(readFileSync(README_PATH, "utf8"));

  test("README has exactly the expected number of ts fences", () => {
    expect(fences.length).toBe(FIXTURES.length);
  });

  for (const [index, fixture] of FIXTURES.entries()) {
    test(`fence #${index + 1} matches ${fixture} verbatim`, () => {
      const source = readFileSync(resolve(import.meta.dir, "fixtures", fixture), "utf8").replace(/\n$/, "");
      expect(fences[index]).toBe(source);
    });
  }
});
