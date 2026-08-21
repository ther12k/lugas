/**
 * Deterministic URL query decoding (M2-004).
 *
 * Decodes URL search parameters into a safe, null-prototype dictionary
 * preserving source order. Repeated keys are represented as string arrays,
 * single occurrences as strings, and missing keys are omitted.
 * No implicit number, boolean, date, CSV, or JSON coercion is performed.
 */

export type DecodedQueryValue = string | ReadonlyArray<string>;
export type DecodedQuery = Record<string, DecodedQueryValue>;

/**
 * Decodes query parameters from a URL, Request, URLSearchParams, or query string.
 * Returns a null-prototype object to defend against prototype pollution.
 */
export function decodeQuery(
  input: string | URL | URLSearchParams | Request,
): DecodedQuery {
  let params: URLSearchParams;

  if (input instanceof URLSearchParams) {
    params = input;
  } else if (typeof input === "string") {
    const qIndex = input.indexOf("?");
    params = new URLSearchParams(qIndex >= 0 ? input.slice(qIndex + 1) : input);
  } else if (input instanceof URL) {
    params = input.searchParams;
  } else if (typeof (input as { readonly url?: unknown })?.url === "string") {
    const urlStr = (input as { readonly url: string }).url;
    const qIndex = urlStr.indexOf("?");
    params = new URLSearchParams(qIndex >= 0 ? urlStr.slice(qIndex + 1) : "");
  } else {
    return Object.create(null) as DecodedQuery;
  }

  const result: Record<string, string | string[]> = Object.create(null);

  for (const [key, value] of params.entries()) {
    if (Object.prototype.hasOwnProperty.call(result, key) || key in result) {
      const current = result[key]!;
      if (Array.isArray(current)) {
        current.push(value);
      } else {
        result[key] = [current, value];
      }
    } else {
      result[key] = value;
    }
  }

  return result as DecodedQuery;
}
