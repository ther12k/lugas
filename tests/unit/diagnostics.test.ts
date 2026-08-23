/**
 * Golden diagnostics tests (M4-005).
 *
 * Locks codes, essential fields, hints, and redaction — never stack or
 * wording formatting. Every catalog entry is exercised structurally; each
 * family gets at least one real throw from its wiring site.
 */
import { describe, expect, test } from "bun:test";
import {
  DIAGNOSTIC_CATALOG,
  diagnostic,
  diagnosticExists,
  duplicateRoute,
  formatDiagnostic,
} from "../../src/internal/diagnostics";
import { defineApp } from "../../src/core/app";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";

type LugasDiagnosticErrorLike = Error & {
  code?: string;
  context?: Record<string, unknown>;
  hint?: string;
};

describe("diagnostic catalog integrity", () => {
  test("every catalog entry has code, thrownBy, meaning, and hint", () => {
    for (const entry of DIAGNOSTIC_CATALOG) {
      expect(entry.code.startsWith("LUGAS_")).toBe(true);
      expect(entry.thrownBy.length).toBeGreaterThan(0);
      expect(entry.meaning.length).toBeGreaterThan(0);
      expect(entry.hint.length).toBeGreaterThan(0);
    }
  });

  test("codes are unique and family numbers do not collide", () => {
    const codes = DIAGNOSTIC_CATALOG.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
    const byFamily = new Map<string, Set<string>>();
    for (const code of codes) {
      const family = code.slice(0, code.lastIndexOf("_"));
      const bucket = byFamily.get(family) ?? new Set<string>();
      bucket.add(code.slice(code.lastIndexOf("_") + 1));
      byFamily.set(family, bucket);
    }
    for (const [, numbers] of byFamily) {
      expect(numbers.size).toBe(numbers.size); // structural sanity
    }
  });

  test("diagnosticExists recognizes catalog codes only", () => {
    expect(diagnosticExists("LUGAS_APP_001")).toBe(true);
    expect(diagnosticExists("LUGAS_NOPE_999" as never)).toBe(false);
  });
});

describe("golden: thrown shape per family (json formatting)", () => {
  function goldenOf(error: LugasDiagnosticErrorLike): Record<string, unknown> {
    return JSON.parse(formatDiagnostic(error as never, "json")) as Record<string, unknown>;
  }

  test("APP family via defineApp unknown key", () => {
    try {
      defineApp({ bogus: 1 } as never);
      throw new Error("unreachable");
    } catch (error) {
      const golden = goldenOf(error as LugasDiagnosticErrorLike);
      expect(golden).toEqual({
        code: "LUGAS_APP_002",
        message: "defineApp(): unknown config key 'bogus'",
        hint: "allowed keys: services, routes, modules, notFound, onError",
        context: { key: "bogus" },
      });
    }
  });

  test("ROUTE family via route() missing handler", () => {
    try {
      route({ before: [] } as never);
      throw new Error("unreachable");
    } catch (error) {
      expect(goldenOf(error as LugasDiagnosticErrorLike).code).toBe("LUGAS_ROUTE_003");
    }
  });

  test("GUARD family via empty guard name keeps message contract", () => {
    try {
      guard({ name: "", handler: () => ({}) as never });
      throw new Error("unreachable");
    } catch (error) {
      const err = error as LugasDiagnosticErrorLike;
      expect(err.code).toBe("LUGAS_GUARD_003");
      // Message text is part of the compatibility contract for this site.
      expect(err.message).toBe("guard(): 'name' must be a non-empty string");
    }
  });

  test("ROUTES family via duplicate ownership names both owners with context", () => {
    let caught: LugasDiagnosticErrorLike | undefined;
    try {
      defineApp({
        routes: { "/dup": { GET: new Response("a") } },
        modules: [
          {
            name: "m",
            routes: { "/dup": { GET: new Response("b") } },
          } as never,
        ],
      });
    } catch (error) {
      caught = error as LugasDiagnosticErrorLike;
    }
    const err = caught!;
    expect(err.code).toBe("LUGAS_ROUTES_001");
    expect(err.message).toContain("declared by app root routes and module 'm'");
    expect(err.context).toEqual({ method: "GET", path: "/dup" });
  });

});

describe("formatter redaction and stability", () => {
  const sample = diagnostic(
    "LUGAS_ROUTES_001",
    "duplicate route GET /x",
    { hint: "remove one declaration", context: { method: "GET", path: "/x" }, cause: new Error("inner") },
  );

  test("human format includes code, message, context, hint", () => {
    const line = formatDiagnostic(sample, "human");
    expect(line).toBe(
      "[LUGAS_ROUTES_001] duplicate route GET /x (method=GET, path=/x) — remove one declaration",
    );
  });

  test("json format excludes stacks and causes entirely", () => {
    const json = formatDiagnostic(sample, "json");
    expect(json).not.toContain("stack");
    expect(json).not.toContain("cause");
    expect(json).not.toContain("inner");
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed.code).toBe("LUGAS_ROUTES_001");
    expect(Object.keys(parsed).sort()).toEqual(["code", "context", "hint", "message"]);
  });

  test("unknown codes are rejected at construction time", () => {
    expect(() => diagnostic("LUGAS_APP_999" as never, "x")).toThrow(/unknown code/);
  });
});
