/**
 * llms.txt golden test (M4-014).
 *
 * Verifies the generated file is deterministic and contains required
 * sections. Read-only: ordinary tests never regenerate.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LLMS_PATH = resolve(import.meta.dir, "../../llms.txt");

describe("llms.txt", () => {
  const content = readFileSync(LLMS_PATH, "utf8");

  test("starts with # Lugas header", () => {
    expect(content.startsWith("# Lugas")).toBe(true);
  });

  test("states no custom router constraint", () => {
    expect(content).toContain("No custom router");
  });

  test("states no Eden dependency", () => {
    expect(content).toContain("No Eden");
  });

  test("states runtime/contract separation", () => {
    expect(content).toContain("separate");
  });

  test("contains server API snippet with defineApp", () => {
    expect(content).toContain('import { defineApp }');
    expect(content).toContain("route({");
    expect(content).toContain("handler:");
  });

  test("contains client API snippet with createClient", () => {
    expect(content).toContain('import { createClient }');
    expect(content).toContain('"lugas/client"');
  });

  test("contains guard pattern", () => {
    expect(content).toContain("guard({");
    expect(content).toContain('"auth"');
  });

  test("references diagnostic codes", () => {
    expect(content).toContain("LUGAS_CLIENT_");
    expect(content).toContain("docs/diagnostics.md");
  });

  test("does not embed benchmark claims or performance numbers", () => {
    expect(content).not.toContain("req/s");
    expect(content).not.toContain("benchmark result");
    expect(content).not.toContain("% faster");
  });

  test("is under 5KB for bounded context consumption", () => {
    expect(content.length).toBeLessThan(5_000);
  });
});
