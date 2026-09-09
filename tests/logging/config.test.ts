/**
 * M8-003 — logging configuration diagnostics (ADR-0024).
 *
 * Pinned contract:
 * - Invalid logging configs throw LUGAS_LOG_001.
 * - Non-object config rejected.
 * - Unknown keys rejected.
 * - Invalid levels rejected.
 * - Non-function sink rejected.
 * - Non-boolean requestIds/access rejected.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, route } from "../../src";

function expectLogDiagnostic(config: unknown): void {
  expect(() => {
    defineApp({
      logging: config as never,
      routes: {
        "/test": { GET: route({ handler: () => new Response("ok") }) },
      },
    });
  }).toThrow();

  try {
    defineApp({
      logging: config as never,
      routes: {
        "/test": { GET: route({ handler: () => new Response("ok") }) },
      },
    });
  } catch (err) {
    const diag = err as { code?: string };
    expect(diag.code).toBe("LUGAS_LOG_001");
  }
}

describe("M8-003 logging configuration diagnostics", () => {
  test("logging must be an object", () => {
    expectLogDiagnostic(null);
    expectLogDiagnostic("invalid");
    expectLogDiagnostic(123);
  });

  test("unknown keys are rejected", () => {
    expectLogDiagnostic({ bogus: true });
    expectLogDiagnostic({ format: "json" });
  });

  test("invalid level is rejected", () => {
    expectLogDiagnostic({ level: "verbose" });
    expectLogDiagnostic({ level: "trace" });
    expectLogDiagnostic({ level: 123 });
  });

  test("invalid sink is rejected", () => {
    expectLogDiagnostic({ sink: "stdout" });
    expectLogDiagnostic({ sink: 123 });
  });

  test("non-boolean flags are rejected", () => {
    expectLogDiagnostic({ access: "yes" });
    expectLogDiagnostic({ requestIds: 1 });
  });

  test("valid configurations pass without error", () => {
    expect(() => {
      defineApp({
        logging: {},
        routes: { "/ok": { GET: () => new Response("ok") } },
      });
    }).not.toThrow();

    expect(() => {
      defineApp({
        logging: {
          level: "debug",
          access: true,
          requestIds: true,
          sink: () => {},
        },
        routes: { "/ok": { GET: () => new Response("ok") } },
      });
    }).not.toThrow();
  });
});
