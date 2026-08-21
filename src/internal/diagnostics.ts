/**
 * Stable diagnostic catalog (M1-012).
 *
 * Messages are deterministic and identify both owners and the route
 * identity. Codes are stable API for tooling; wording may evolve.
 */
export type DiagnosticCode = "ROUTE_DUPLICATE" | "MODULE_DUPLICATE" | "ROUTE_UNSUPPORTED" | "PATH_INVALID";

export type LugasDiagnostic = {
  code: DiagnosticCode;
  message: string;
};

export function duplicateRoute(method: string, path: string, first: string, second: string): LugasDiagnostic {
  return {
    code: "ROUTE_DUPLICATE",
    message: `duplicate route ${method} ${path}: declared by ${first} and ${second}`,
  };
}

export function unsupportedRoute(path: string, owner: string): LugasDiagnostic {
  return {
    code: "ROUTE_UNSUPPORTED",
    message: `unsupported route entry at ${path} (owner ${owner})`,
  };
}
