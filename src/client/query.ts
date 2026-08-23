/**
 * Client-side query serialization (M3-009).
 *
 * Serializes typed query input through `URLSearchParams` so it round-trips
 * exactly through the server's deterministic decoder (M2-004): repeated keys
 * become arrays, single values stay strings, empty strings are preserved,
 * source order is kept, and every key/value is encoded exactly once.
 *
 * Policy (documented, tested):
 * - `undefined` properties are omitted;
 * - arrays are serialized as repeated keys — never CSV or JSON guessing;
 * - an empty array omits the key entirely (matching decoder absence);
 * - documented scalars are `string | number | boolean`, stringified once;
 * - `null`, nested objects, nested arrays, and non-scalar elements are
 *   rejected with a stable diagnostic before any fetch.
 */

export type ClientQueryValue = string | number | boolean;

export type ClientQueryInput = Record<
  string,
  ClientQueryValue | readonly ClientQueryValue[] | undefined
>;

const DIAGNOSTIC_CODE = "LUGAS_CLIENT_006";

/** Query serialization policy violation; thrown before any network dispatch. */
export class ClientQueryError extends Error {
  readonly code: typeof DIAGNOSTIC_CODE;

  constructor(message: string) {
    super(`${DIAGNOSTIC_CODE}: ${message}`);
    this.name = "ClientQueryError";
    this.code = DIAGNOSTIC_CODE;
  }
}

function isScalar(value: unknown): value is ClientQueryValue {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * Serializes query input to an encoded query string without the leading `?`.
 * Returns `""` when there is nothing to append. Keys and values are encoded
 * exactly once by `URLSearchParams`.
 *
 * The parameter is deliberately `unknown`: this function is the runtime
 * enforcement point of the query policy (compile-time typing is provided by
 * `MethodCallInput`). Every violation throws `LUGAS_CLIENT_006` before fetch.
 */
export function serializeQuery(query: unknown): string {
  if (query === undefined) {
    return "";
  }
  if (typeof query !== "object" || query === null || Array.isArray(query)) {
    throw new ClientQueryError("query input must be an object");
  }
  const record = query as { readonly [key: string]: unknown };
  const params = new URLSearchParams();
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (value === undefined) {
      continue;
    }
    if (!isScalar(value) && !Array.isArray(value)) {
      throw new ClientQueryError(
        `invalid query value for '${key}': expected string, number, boolean, or array of scalars`,
      );
    }
    if (Array.isArray(value)) {
      for (const element of value) {
        if (!isScalar(element)) {
          throw new ClientQueryError(
            `invalid query element in '${key}': expected string, number, or boolean`,
          );
        }
        params.append(key, String(element));
      }
      continue;
    }
    params.append(key, String(value));
  }
  return params.toString();
}

/**
 * The single preservation rule for building a request target: a non-empty
 * serialized query is appended to the path with `?`, or with `&` when the
 * path already carries its own query. Existing queries are never clobbered.
 */
export function appendQuery(path: string, queryString: string): string {
  if (queryString === "") {
    return path;
  }
  return `${path}${path.includes("?") ? "&" : "?"}${queryString}`;
}
