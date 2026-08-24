// src/client/path.ts
class ClientPathError extends Error {
  code;
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "ClientPathError";
    this.code = code;
  }
}
var PARAM_NAME = /^[A-Za-z0-9_]+$/;
var templateCache = new Map;
function parseTemplate(template) {
  const cached = templateCache.get(template);
  if (cached !== undefined) {
    return cached;
  }
  if (typeof template !== "string" || !template.startsWith("/")) {
    throw new ClientPathError("LUGAS_CLIENT_005", `route template must start with '/': ${JSON.stringify(String(template))}`);
  }
  const segments = template.slice(1).split("/");
  const names = [];
  let hasWildcard = false;
  for (let i = 0;i < segments.length; i++) {
    const segment = segments[i];
    if (segment.startsWith(":")) {
      const name = segment.slice(1);
      if (!PARAM_NAME.test(name)) {
        throw new ClientPathError("LUGAS_CLIENT_005", `invalid param token '${segment}' in template '${template}'`);
      }
      if (names.includes(name)) {
        throw new ClientPathError("LUGAS_CLIENT_004", `ambiguous duplicate param ':${name}' in template '${template}'`);
      }
      names.push(name);
      continue;
    }
    if (segment === "*") {
      if (i !== segments.length - 1) {
        throw new ClientPathError("LUGAS_CLIENT_005", `wildcard '*' must be the final segment in template '${template}'`);
      }
      hasWildcard = true;
      continue;
    }
    if (segment.includes("*")) {
      throw new ClientPathError("LUGAS_CLIENT_005", `malformed segment '${segment}' in template '${template}'`);
    }
  }
  const parsed = { names, hasWildcard };
  templateCache.set(template, parsed);
  return parsed;
}
function encodeSegments(value) {
  return value.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}
function interpolatePath(template, params) {
  const parsed = parseTemplate(template);
  if (params === undefined) {
    if (parsed.names.length > 0 || parsed.hasWildcard) {
      throw new ClientPathError("LUGAS_CLIENT_001", `missing path parameter${parsed.hasWildcard ? "s" : ""} ${describeDeclared(parsed)} for '${template}'`);
    }
    return template;
  }
  if (typeof params !== "object" || params === null || Array.isArray(params)) {
    throw new ClientPathError("LUGAS_CLIENT_003", "params must be an object");
  }
  const provided = params;
  for (const key of Object.keys(provided)) {
    const declared = parsed.names.includes(key) || key === "*" && parsed.hasWildcard;
    if (!declared) {
      throw new ClientPathError("LUGAS_CLIENT_002", `unexpected path parameter ':${key}' is not declared by '${template}'`);
    }
  }
  const source = template.slice(1).split("/");
  const parts = [];
  for (const segment of source) {
    if (!segment.startsWith(":") && segment !== "*") {
      parts.push(segment);
      continue;
    }
    const key = segment === "*" ? "*" : segment.slice(1);
    if (!(key in provided) || provided[key] === undefined || provided[key] === null) {
      throw new ClientPathError("LUGAS_CLIENT_001", `missing path parameter ':${key}' for '${template}'`);
    }
    const value = provided[key];
    if (segment === "*") {
      if (typeof value === "string") {
        parts.push(encodeSegments(value));
        continue;
      }
      if (Array.isArray(value)) {
        for (const element of value) {
          if (typeof element !== "string" || element === "") {
            throw new ClientPathError("LUGAS_CLIENT_003", `invalid wildcard segment ${JSON.stringify(String(element))} for '*': elements must be non-empty strings`);
          }
        }
        parts.push(value.map((element) => encodeURIComponent(element)).join("/"));
        continue;
      }
      throw new ClientPathError("LUGAS_CLIENT_003", `invalid wildcard value for '*' in '${template}': expected string or array of strings`);
    }
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      throw new ClientPathError("LUGAS_CLIENT_003", `invalid value for ':${key}' in '${template}': expected string, number, or boolean`);
    }
    parts.push(encodeURIComponent(String(value)));
  }
  return `/${parts.join("/")}`;
}
function describeDeclared(parsed) {
  const described = parsed.names.map((name) => `':${name}'`);
  if (parsed.hasWildcard) {
    described.push("'*'");
  }
  return described.join(", ");
}

// src/client/query.ts
var DIAGNOSTIC_CODE = "LUGAS_CLIENT_006";

class ClientQueryError extends Error {
  code;
  constructor(message) {
    super(`${DIAGNOSTIC_CODE}: ${message}`);
    this.name = "ClientQueryError";
    this.code = DIAGNOSTIC_CODE;
  }
}
function isScalar(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function serializeQuery(query) {
  if (query === undefined) {
    return "";
  }
  if (typeof query !== "object" || query === null || Array.isArray(query)) {
    throw new ClientQueryError("query input must be an object");
  }
  const record = query;
  const params = new URLSearchParams;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (value === undefined) {
      continue;
    }
    if (!isScalar(value) && !Array.isArray(value)) {
      throw new ClientQueryError(`invalid query value for '${key}': expected string, number, boolean, or array of scalars`);
    }
    if (Array.isArray(value)) {
      for (const element of value) {
        if (!isScalar(element)) {
          throw new ClientQueryError(`invalid query element in '${key}': expected string, number, or boolean`);
        }
        params.append(key, String(element));
      }
      continue;
    }
    params.append(key, String(value));
  }
  return params.toString();
}
function appendQuery(path, queryString) {
  if (queryString === "") {
    return path;
  }
  return `${path}${path.includes("?") ? "&" : "?"}${queryString}`;
}

// src/client/request.ts
class ClientRequestError extends Error {
  code;
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "ClientRequestError";
    this.code = code;
  }
}
var OWNED_INIT_KEYS = new Set(["method", "body", "headers"]);
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function applyHeaderEntries(target, source, origin) {
  if (source === undefined || source === null) {
    return;
  }
  if (!isRecord(source)) {
    throw new ClientRequestError("LUGAS_CLIENT_009", `${origin} must be an object`);
  }
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== "string") {
      throw new ClientRequestError("LUGAS_CLIENT_009", `${origin} '${key}' must be a string`);
    }
    if (/[\r\n]/.test(value)) {
      throw new ClientRequestError("LUGAS_CLIENT_009", `${origin} '${key}' contains forbidden line-break characters`);
    }
    target.set(key, value);
  }
}
function isJsonCompatibleContentType(value) {
  const mediaType = value.split(";")[0].trim().toLowerCase();
  return mediaType === "application/json" || mediaType === "application/problem+json" || mediaType.startsWith("application/") && mediaType.endsWith("+json");
}
function serializeJsonBody(body) {
  try {
    const serialized = JSON.stringify(body);
    if (serialized === undefined) {
      throw new ClientRequestError("LUGAS_CLIENT_008", "declared body is not JSON-representable");
    }
    return serialized;
  } catch (error) {
    if (error instanceof ClientRequestError) {
      throw error;
    }
    throw new ClientRequestError("LUGAS_CLIENT_008", "declared body is not JSON-serializable");
  }
}
function buildRequestInit(options) {
  let platform = {};
  if (options.init !== undefined && options.init !== null) {
    if (!isRecord(options.init)) {
      throw new ClientRequestError("LUGAS_CLIENT_007", "platform options must be an object");
    }
    platform = options.init;
  }
  for (const owned of Object.keys(platform)) {
    if (OWNED_INIT_KEYS.has(owned)) {
      throw new ClientRequestError("LUGAS_CLIENT_007", `platform options may not own '${owned}'; it is controlled by the typed call`);
    }
  }
  const headers = new Headers;
  applyHeaderEntries(headers, options.headers, "typed header");
  const hasDeclaredBody = options.body !== undefined;
  let body;
  if (hasDeclaredBody) {
    const callerContentType = headers.get("content-type");
    if (callerContentType !== null && !isJsonCompatibleContentType(callerContentType)) {
      throw new ClientRequestError("LUGAS_CLIENT_008", `declared JSON body conflicts with caller content-type '${callerContentType.split(";")[0].trim().toLowerCase()}'`);
    }
    if (callerContentType === null) {
      headers.set("content-type", "application/json");
    }
    body = serializeJsonBody(options.body);
  }
  const rest = {};
  for (const [key, value] of Object.entries(platform)) {
    if (!OWNED_INIT_KEYS.has(key)) {
      rest[key] = value;
    }
  }
  const init = {
    ...rest,
    method: options.method,
    headers
  };
  if (hasDeclaredBody) {
    init.body = body;
  }
  return { init };
}

// src/client/errors.ts
var CLIENT_DECODE_ERROR_CODE = "LUGAS_CLIENT_010";

class ClientDecodeError extends Error {
  code;
  response;
  status;
  contentType;
  constructor(response, cause) {
    const contentType = response.headers.get("content-type");
    super(`${CLIENT_DECODE_ERROR_CODE}: failed to decode declared JSON body`, { cause });
    this.name = "ClientDecodeError";
    this.code = CLIENT_DECODE_ERROR_CODE;
    this.response = response;
    this.status = response.status;
    this.contentType = contentType;
  }
}

// src/client/parse-response.ts
var BODILESS_STATUSES = new Set([204, 205, 304]);
function isJsonMedia(mediaType) {
  return mediaType === "application/json" || mediaType === "application/problem+json" || mediaType.startsWith("application/") && mediaType.endsWith("+json");
}
async function readBody(response, options) {
  const contentType = response.headers.get("content-type");
  const mediaType = contentType?.split(";")[0]?.trim().toLowerCase();
  if (mediaType === undefined || mediaType === "" || response.body === null || options.method?.toUpperCase() === "HEAD" || BODILESS_STATUSES.has(response.status)) {
    return;
  }
  if (isJsonMedia(mediaType)) {
    try {
      return await response.clone().json();
    } catch (cause) {
      throw new ClientDecodeError(response, cause);
    }
  }
  if (mediaType.startsWith("text/")) {
    return await response.clone().text();
  }
  return;
}
async function parseResponse(response, options = {}) {
  const body = await readBody(response, options);
  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      data: body,
      response
    };
  }
  return {
    ok: false,
    status: response.status,
    error: body,
    response
  };
}

// src/client/create-client.ts
var DIAGNOSTIC_PREFIX = "createClient():";
function normalizeBaseUrl(baseUrl) {
  let parsed;
  try {
    parsed = baseUrl instanceof URL ? baseUrl : new URL(baseUrl);
  } catch {
    throw new Error(`${DIAGNOSTIC_PREFIX} invalid baseUrl ${JSON.stringify(String(baseUrl))}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${DIAGNOSTIC_PREFIX} baseUrl must use http(s), got '${parsed.protocol}'`);
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    throw new Error(`${DIAGNOSTIC_PREFIX} baseUrl must not include a query or hash; pass query parameters per request`);
  }
  const basePath = parsed.pathname.replace(/\/+$/, "");
  return { origin: parsed.origin, basePath };
}
function joinUrl(base, path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base.origin}${base.basePath}${normalizedPath}`;
}
var CLIENT_HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS"
];
function slot(input, key) {
  if (typeof input !== "object" || input === null) {
    return;
  }
  return input[key];
}
function createClient(config) {
  if (typeof config !== "object" || config === null) {
    throw new Error(`${DIAGNOSTIC_PREFIX} config must be an object`);
  }
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const transport = config.fetch ?? globalThis.fetch.bind(globalThis);
  const send = (method, path, input) => {
    const target = appendQuery(joinUrl(baseUrl, interpolatePath(path, slot(input, "params"))), serializeQuery(slot(input, "query")));
    const built = buildRequestInit({
      method,
      headers: slot(input, "headers"),
      body: slot(input, "body"),
      init: slot(input, "init")
    });
    const parse = async () => {
      const response = await transport(target, built.init);
      return parseResponse(response, { method });
    };
    return parse();
  };
  const methodFn = (httpMethod) => (path, input) => send(httpMethod, path, input);
  return Object.freeze({
    baseUrl,
    fetch: transport,
    get: methodFn("GET"),
    post: methodFn("POST"),
    put: methodFn("PUT"),
    patch: methodFn("PATCH"),
    delete: methodFn("DELETE"),
    head: methodFn("HEAD"),
    options: methodFn("OPTIONS"),
    request: (method, path) => {
      if (!CLIENT_HTTP_METHODS.includes(method)) {
        throw new Error(`${DIAGNOSTIC_PREFIX} unsupported request method ${JSON.stringify(String(method))}; expected one of ${CLIENT_HTTP_METHODS.join(", ")}`);
      }
      return transport(joinUrl(baseUrl, path), { method });
    }
  });
}

// tests/package/client-browser/browser-fixture.ts
var calls = [];
var fetchStub = async (input, init) => {
  calls.push(`${String(input)}|${init?.method ?? "GET"}`);
  const url = String(input);
  return new Response(JSON.stringify({ ok: url.includes("/u/"), done: url.includes("/act") }), {
    status: url.includes("/act") ? 201 : 200,
    headers: { "content-type": "application/json" }
  });
};
var client = createClient({ baseUrl: "https://x.test/api", fetch: fetchStub });
var got = await client.get("/u/:id", { params: { id: "a b" }, query: { q: "日本" } });
if (!got.ok) {
  throw new Error(`SMOKE-FAIL GET status ${String(got.status)}`);
}
if (got.data?.ok !== true) {
  throw new Error(`SMOKE-FAIL GET payload ${JSON.stringify(got.data)}`);
}
var posted = await client.post("/act", { body: { name: "Ada" } });
if (!posted.ok || posted.data?.done !== true) {
  throw new Error("SMOKE-FAIL POST");
}
var joined = appendQuery(interpolatePath("/s/:id", { id: "7" }), serializeQuery({ q: "x" }));
if (joined !== "/s/7?q=x") {
  throw new Error(`SMOKE-FAIL helpers ${joined}`);
}
var expectedGet = "https://x.test/api/u/a%20b?q=%E6%97%A5%E6%9C%AC|GET";
var expectedPost = "https://x.test/api/act|POST";
if (calls[0] !== expectedGet || calls[1] !== expectedPost) {
  throw new Error(`SMOKE-FAIL calls ${JSON.stringify(calls)}`);
}
console.log("CLIENT-SMOKE-OK");
