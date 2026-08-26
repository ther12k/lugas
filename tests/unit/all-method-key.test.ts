/**
 * ALL method-key rejection tests (M6R1-010).
 *
 * Bun 1.4.0 rejects `ALL` as a method-map key with a raw TypeError at serve
 * time. Lugas must reject it earlier — at prepareApp — with the stable
 * LUGAS_ROUTES_002 diagnostic instead of letting Bun's error surface.
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";
import { prepareApp } from "../../src/internal/prepared-app";
import type { LugasDiagnosticError } from "../../src/internal/diagnostics";

function catchDiagnostic(fn: () => unknown): LugasDiagnosticError {
  try {
    fn();
  } catch (error) {
    return error as LugasDiagnosticError;
  }
  throw new Error("expected a throw");
}

describe("ALL method key rejection (M6R1-010)", () => {
  test("prepareApp rejects { ALL: route } with LUGAS_ROUTES_002, not a Bun TypeError", () => {
    const error = catchDiagnostic(() =>
      prepareApp({
        services: {},
        routes: {
          "/everything": { ALL: route({ handler: () => json(200, { ok: true }) }) } as never,
        },
      }),
    );
    expect(error.name).toBe("LugasDiagnosticError");
    expect(error.code).toBe("LUGAS_ROUTES_002");
  });

  test("defineApp rejects the ALL key with the stable diagnostic", () => {
    const error = catchDiagnostic(() =>
      defineApp({
        routes: {
          "/everything": { ALL: route({ handler: () => json(200, { ok: true }) }) } as never,
        },
      }),
    );
    expect(error.name).toBe("LugasDiagnosticError");
    expect(error.code).toBe("LUGAS_ROUTES_002");
  });

  test("the diagnostic hint no longer recommends ALL", () => {
    const error = catchDiagnostic(() =>
      prepareApp({
        services: {},
        routes: { "/x": { ALL: () => new Response("x") } as never },
      }),
    );
    expect(error.hint).toBeDefined();
    expect(error.hint).not.toContain("or ALL");
    expect(error.hint).toContain("there is no ALL key");
  });
});
