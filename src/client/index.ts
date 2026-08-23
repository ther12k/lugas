/**
 * Public `lugas/client` surface (M3-018).
 *
 * The client and its contract/result types only: internal helper modules are
 * implementation details and are not exposed as package subpaths.
 */
export {
  CLIENT_HTTP_METHODS,
  createClient,
  joinUrl,
  normalizeBaseUrl,
} from "./create-client";
export type {
  ClientConfig,
  ClientFetch,
  LugasClient,
  NormalizedBaseUrl,
} from "./create-client";

export { ClientDecodeError, CLIENT_DECODE_ERROR_CODE } from "./errors";

export { ClientPathError, interpolatePath } from "./path";
export type {
  ClientPathErrorCode,
  ClientPathParams,
  ClientPathParamValue,
  ClientWildcardValue,
} from "./path";

export { appendQuery, serializeQuery, ClientQueryError } from "./query";
export type { ClientQueryInput, ClientQueryValue } from "./query";

export { buildRequestInit, ClientRequestError } from "./request";
export type {
  BuildRequestOptions,
  BuiltRequest,
  ClientRequestErrorCode,
} from "./request";

export { parseResponse } from "./parse-response";
export type {
  ClientFailure,
  ClientResult,
  ClientSuccess,
} from "./parse-response";

export type {
  ClientCallResult,
  ClientResultForOutcome,
  MethodBodyInput,
  MethodCallInput,
  MethodHeadersInput,
  MethodParamsInput,
  MethodPlatformInit,
  MethodQueryInput,
  StatusBranch,
} from "./types";
