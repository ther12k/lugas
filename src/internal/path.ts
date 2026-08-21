/**
 * Path token validation and literal param extraction (M1-013).
 *
 * Supported invariants on the pinned Bun baseline: paths start with `/`;
 * param tokens are `:name` segments appearing at most once each; wildcard
 * `*` may appear only as the final segment. Runtime schema-key comparison
 * waits for a reliable adapter (M2-003); these checks are purely syntactic.
 */
import type { LugasDiagnostic } from "./diagnostics";

export type PathAnalysis = {
  paramNames: ReadonlyArray<string>;
};

export function analyzePath(path: string): PathAnalysis | LugasDiagnostic {
  if (typeof path !== "string" || !path.startsWith("/")) {
    return { code: "PATH_INVALID", message: `route path must start with '/': ${JSON.stringify(path)}` };
  }
  const segments = path.slice(1).split("/");
  const paramNames: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    if (segment.startsWith(":")) {
      const name = segment.slice(1);
      if (name === "" || !/^[A-Za-z0-9_]+$/.test(name)) {
        return { code: "PATH_INVALID", message: `invalid param token '${segment}' in path ${path}` };
      }
      if (paramNames.includes(name)) {
        return { code: "PATH_INVALID", message: `duplicate param ':${name}' in path ${path}` };
      }
      paramNames.push(name);
      continue;
    }
    if (segment === "*") {
      if (i !== segments.length - 1) {
        return { code: "PATH_INVALID", message: `wildcard '*' must be the final segment in path ${path}` };
      }
      continue;
    }
    if (segment.includes("*") || segment.startsWith(":")) {
      return { code: "PATH_INVALID", message: `malformed segment '${segment}' in path ${path}` };
    }
  }
  return { paramNames };
}

export function isDiagnostic(value: unknown): value is LugasDiagnostic {
  return typeof value === "object" && value !== null && "code" in value && "message" in value;
}
