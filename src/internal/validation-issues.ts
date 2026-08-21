/**
 * Safe, bounded normalization of Standard Schema validation issues (M2-002).
 *
 * Converts arbitrary validator issue arrays into serializable, bounded
 * diagnostics suitable for RFC 9457 Problem Details. Never throws on malformed
 * or hostile input, never serializes raw request values/causes/schemas, and
 * bounds issue count, message length, and path depth.
 */
import type { StandardSchemaIssue } from "./standard-schema";

export type NormalizedValidationIssue = {
  readonly message: string;
  readonly path?: ReadonlyArray<string | number> | undefined;
  readonly code?: string | undefined;
  readonly expected?: string | undefined;
  readonly received?: string | undefined;
  readonly [key: string]: unknown;
};

export type NormalizeIssuesOptions = {
  readonly maxIssues?: number;
  readonly maxMessageLength?: number;
  readonly maxPathSegments?: number;
};

const DEFAULT_MAX_ISSUES = 50;
const DEFAULT_MAX_MESSAGE_LENGTH = 500;
const DEFAULT_MAX_PATH_SEGMENTS = 20;

/** Denylist of fields that could leak sensitive payloads or contain cycles/functions/schemas. */
const UNSAFE_KEYS = new Set([
  "input",
  "value",
  "schema",
  "cause",
  "error",
  "parent",
  "root",
  "context",
  "parser",
  "validator",
  "raw",
  "payload",
  "req",
  "request",
]);

function normalizeSegment(segment: unknown): string | number | undefined {
  if (typeof segment === "string") return segment.slice(0, 100);
  if (typeof segment === "number" && Number.isFinite(segment)) return segment;
  if (typeof segment === "symbol") return segment.description ?? segment.toString();
  if (typeof segment === "object" && segment !== null) {
    try {
      const key = (segment as { readonly key?: unknown }).key;
      if (typeof key === "string") return key.slice(0, 100);
      if (typeof key === "number" && Number.isFinite(key)) return key;
      if (typeof key === "symbol") return key.description ?? key.toString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function normalizePath(
  rawPath: unknown,
  maxSegments: number,
): ReadonlyArray<string | number> | undefined {
  if (!Array.isArray(rawPath)) return undefined;
  const segments: Array<string | number> = [];
  const limit = Math.min(rawPath.length, maxSegments);
  for (let i = 0; i < limit; i++) {
    const norm = normalizeSegment(rawPath[i]);
    if (norm !== undefined) segments.push(norm);
  }
  return segments.length > 0 ? segments : undefined;
}

function normalizeSingleIssue(
  raw: unknown,
  maxMessageLength: number,
  maxPathSegments: number,
  visited: WeakSet<object>,
): NormalizedValidationIssue {
  if (typeof raw !== "object" || raw === null) {
    return { message: "Validation issue" };
  }

  if (visited.has(raw)) {
    return { message: "[Cyclic validation issue]" };
  }
  visited.add(raw);

  let message = "Invalid input";
  try {
    const rawMsg = (raw as { readonly message?: unknown }).message;
    if (typeof rawMsg === "string" && rawMsg.length > 0) {
      message = rawMsg.slice(0, maxMessageLength);
    }
  } catch {
    message = "Invalid input";
  }

  let path: ReadonlyArray<string | number> | undefined;
  try {
    const rawPath = (raw as { readonly path?: unknown }).path;
    path = normalizePath(rawPath, maxPathSegments);
  } catch {
    path = undefined;
  }

  const issue: Record<string, unknown> = { message };
  if (path !== undefined) issue.path = path;

  // Extract safe primitive extension fields (code, expected, received, etc.)
  try {
    for (const [key, val] of Object.entries(raw)) {
      if (key === "message" || key === "path" || UNSAFE_KEYS.has(key)) continue;
      if (typeof val === "string") {
        issue[key] = val.slice(0, maxMessageLength);
      } else if (typeof val === "number" && Number.isFinite(val)) {
        issue[key] = val;
      } else if (typeof val === "boolean") {
        issue[key] = val;
      }
    }
  } catch {
    // If property iteration fails on a hostile getter, safely continue with base message
  }

  return issue as NormalizedValidationIssue;
}

/**
 * Normalizes an array of validator issues into a safe, bounded structure.
 * Never throws regardless of the input structure.
 */
export function normalizeValidationIssues(
  rawIssues: unknown,
  options: NormalizeIssuesOptions = {},
): ReadonlyArray<NormalizedValidationIssue> {
  const maxIssues = options.maxIssues ?? DEFAULT_MAX_ISSUES;
  const maxMessageLength = options.maxMessageLength ?? DEFAULT_MAX_MESSAGE_LENGTH;
  const maxPathSegments = options.maxPathSegments ?? DEFAULT_MAX_PATH_SEGMENTS;

  if (!Array.isArray(rawIssues)) {
    if (rawIssues === undefined || rawIssues === null) return [];
    const visited = new WeakSet<object>();
    return [normalizeSingleIssue(rawIssues, maxMessageLength, maxPathSegments, visited)];
  }

  const result: NormalizedValidationIssue[] = [];
  const visited = new WeakSet<object>();
  const limit = Math.min(rawIssues.length, maxIssues);

  for (let i = 0; i < limit; i++) {
    result.push(normalizeSingleIssue(rawIssues[i], maxMessageLength, maxPathSegments, visited));
  }

  if (rawIssues.length > maxIssues) {
    result.push({
      message: `[${rawIssues.length - maxIssues} additional issues truncated]`,
    });
  }

  return result;
}
