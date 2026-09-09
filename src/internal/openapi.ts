/**
 * OpenAPI 3.1 generation and Scalar reference UI (M8-004, ADR-0025).
 *
 * Generation-first OpenAPI 3.1:
 * - Gathers facts from the prepared routing graph and explicit route metadata.
 * - Standard Schema v1 validation feature-detects Standard JSON Schema
 *   (`~standard.jsonSchema`) or falls back to presence-only structural documentation
 *   (never invents or guesses types).
 * - RFC 9457 Problem Details is documented as the standard error component.
 * - Serves JSON at `path` (default `/openapi.json`) and opt-in Scalar CDN HTML shell
 *   at `ui.path` (default `/docs`).
 * - Zero external npm dependencies.
 */
import { diagnostic } from "./diagnostics";
import type { RouteFact } from "./route-fact";
import { json } from "../core/response";

export type OpenApiDocumentInfo = {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: { name?: string; url?: string; email?: string };
  license?: { name: string; url?: string; identifier?: string };
  [key: string]: unknown;
};

export type OpenApiRouteMetadata = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: ReadonlyArray<string>;
  deprecated?: boolean;
  /** Explicit OpenAPI schema overrides for params/query/headers/body/responses */
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: Record<string, unknown>;
  responses?: Record<string | number, unknown>;
};

export type OpenApiUiConfig = {
  path?: string;
};

export type OpenApiConfig = {
  document: OpenApiDocumentInfo;
  path?: string;
  ui?: OpenApiUiConfig | boolean;
};

export type CompiledOpenApi = {
  readonly path: string;
  readonly uiPath: string | null;
  readonly document: OpenApiDocumentInfo;
};

const OPENAPI_CONFIG_KEYS = new Set(["document", "path", "ui"]);

function openApiError(code: "LUGAS_OPENAPI_001" | "LUGAS_OPENAPI_002", message: string, hint: string, context?: Record<string, string | number | boolean | null>): never {
  throw diagnostic(code, message, { hint, ...(context !== undefined ? { context } : {}) });
}

export function compileOpenApiConfig(config: OpenApiConfig): CompiledOpenApi {
  if (typeof config !== "object" || config === null) {
    openApiError("LUGAS_OPENAPI_001", "defineApp(): 'openapi' must be an object", "pass openapi: { document: { title: 'API', version: '1.0.0' } }");
  }
  for (const key of Object.keys(config)) {
    if (!OPENAPI_CONFIG_KEYS.has(key)) {
      openApiError("LUGAS_OPENAPI_001", `defineApp(): unknown openapi key '${key}'`, "allowed keys: document, path, ui", { key });
    }
  }
  if (typeof config.document !== "object" || config.document === null) {
    openApiError("LUGAS_OPENAPI_001", "defineApp(): openapi.document must be an object", "document requires title and version");
  }
  if (typeof config.document.title !== "string" || config.document.title.trim() === "") {
    openApiError("LUGAS_OPENAPI_001", "defineApp(): openapi.document.title must be a non-empty string", "example: title: 'My Service'");
  }
  if (typeof config.document.version !== "string" || config.document.version.trim() === "") {
    openApiError("LUGAS_OPENAPI_001", "defineApp(): openapi.document.version must be a non-empty string", "example: version: '1.0.0'");
  }

  const docPath = config.path !== undefined ? config.path : "/openapi.json";
  if (typeof docPath !== "string" || !docPath.startsWith("/")) {
    openApiError("LUGAS_OPENAPI_001", "defineApp(): openapi.path must start with '/'", "example: path: '/openapi.json'");
  }

  let uiPath: string | null = null;
  if (config.ui === true) {
    uiPath = "/docs";
  } else if (typeof config.ui === "object" && config.ui !== null) {
    uiPath = config.ui.path !== undefined ? config.ui.path : "/docs";
    if (typeof uiPath !== "string" || !uiPath.startsWith("/")) {
      openApiError("LUGAS_OPENAPI_001", "defineApp(): openapi.ui.path must start with '/'", "example: path: '/docs'");
    }
  } else if (config.ui !== undefined && config.ui !== false) {
    openApiError("LUGAS_OPENAPI_001", "defineApp(): openapi.ui must be a boolean or an object { path }", "example: ui: { path: '/docs' } or ui: true");
  }

  if (uiPath !== null && uiPath === docPath) {
    openApiError("LUGAS_OPENAPI_001", `defineApp(): openapi.path and openapi.ui.path collide at '${docPath}'`, "use distinct paths for the JSON document and the UI shell");
  }

  return Object.freeze({
    path: docPath,
    uiPath,
    document: config.document,
  });
}

function extractJsonSchema(schema: unknown): Record<string, unknown> | null {
  if (typeof schema !== "object" || schema === null) return null;
  const standard = (schema as { "~standard"?: { jsonSchema?: unknown } })["~standard"];
  if (typeof standard === "object" && standard !== null && typeof standard.jsonSchema === "function") {
    try {
      const result = standard.jsonSchema();
      if (typeof result === "object" && result !== null) {
        return result as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/** Standard Problem Details schema component (RFC 9457) */
const PROBLEM_DETAILS_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", format: "uri" },
    title: { type: "string" },
    status: { type: "integer" },
    detail: { type: "string" },
    instance: { type: "string", format: "uri-reference" },
    code: { type: "string" },
    invalid_params: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
  required: ["status"],
};

export function generateOpenApiDocument(
  compiledConfig: CompiledOpenApi,
  facts: ReadonlyArray<RouteFact>,
  rawDescriptors: Map<string, unknown>,
): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const fact of facts) {
    // Only API endpoints are documented; wildcard '*' methods or unsupported entries skipped
    if (fact.method === "*" || fact.kind !== "lugas") continue;

    // Convert Bun router path params (:id, *wild) to OpenAPI curly braces ({id})
    const openApiPath = fact.path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}").replace(/\*([a-zA-Z0-9_]+)?/g, "{wildcard}");

    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }

    const methodLower = fact.method.toLowerCase();
    const routeId = `${fact.method} ${fact.path}`;
    const desc = rawDescriptors.get(routeId) as {
      openapi?: OpenApiRouteMetadata;
      params?: unknown;
      query?: unknown;
      headers?: unknown;
      body?: unknown;
    } | undefined;

    const meta = desc?.openapi ?? {};
    const parameters: Array<Record<string, unknown>> = [];

    // Path parameters
    const pathParamNames = (fact.path.match(/:([a-zA-Z0-9_]+)/g) || []).map((p) => p.slice(1));
    const paramsJsonSchema = desc?.params ? extractJsonSchema(desc.params) : null;

    for (const name of pathParamNames) {
      const explicitParam = meta.params?.[name] as Record<string, unknown> | undefined;
      const jsonProps = paramsJsonSchema?.properties as Record<string, unknown> | undefined;
      const paramSchema = explicitParam ?? jsonProps?.[name] ?? { type: "string" };
      parameters.push({
        name,
        in: "path",
        required: true,
        schema: paramSchema,
      });
    }

    // Query parameters
    if (fact.validates.includes("query")) {
      const queryJsonSchema = desc?.query ? extractJsonSchema(desc.query) : null;
      if (meta.query) {
        for (const [name, schemaObj] of Object.entries(meta.query)) {
          parameters.push({
            name,
            in: "query",
            required: false,
            schema: schemaObj,
          });
        }
      } else if (queryJsonSchema && queryJsonSchema.properties) {
        for (const [name, schemaObj] of Object.entries(queryJsonSchema.properties)) {
          parameters.push({
            name,
            in: "query",
            required: Array.isArray(queryJsonSchema.required) && queryJsonSchema.required.includes(name),
            schema: schemaObj,
          });
        }
      } else {
        // Presence-only fallback
        parameters.push({
          name: "query",
          in: "query",
          required: false,
          schema: { type: "object" },
          description: "Declared query parameters",
        });
      }
    }

    // Request body
    let requestBody: Record<string, unknown> | undefined;
    if (fact.validates.includes("body")) {
      const bodyJsonSchema = desc?.body ? extractJsonSchema(desc.body) : null;
      const schema = meta.body ?? bodyJsonSchema ?? { type: "object" };
      requestBody = {
        required: true,
        content: {
          "application/json": { schema },
        },
      };
    }

    // Responses
    const responses: Record<string, unknown> = {
      default: {
        description: "RFC 9457 Problem Details Error",
        content: {
          "application/problem+json": {
            schema: { $ref: "#/components/schemas/ProblemDetails" },
          },
        },
      },
    };

    if (meta.responses) {
      for (const [status, resp] of Object.entries(meta.responses)) {
        responses[String(status)] = typeof resp === "string" ? { description: resp } : resp;
      }
    } else {
      responses["200"] = {
        description: "Successful response",
      };
    }

    const operation: Record<string, unknown> = {
      ...(meta.operationId ? { operationId: meta.operationId } : {}),
      ...(meta.summary ? { summary: meta.summary } : {}),
      ...(meta.description ? { description: meta.description } : {}),
      tags: meta.tags ?? (fact.module ? [fact.module] : []),
      ...(meta.deprecated ? { deprecated: true } : {}),
      ...(parameters.length > 0 ? { parameters } : {}),
      ...(requestBody ? { requestBody } : {}),
      responses,
    };

    paths[openApiPath][methodLower] = operation;
  }

  return {
    openapi: "3.1.0",
    info: compiledConfig.document,
    paths,
    components: {
      schemas: {
        ProblemDetails: PROBLEM_DETAILS_SCHEMA,
      },
    },
  };
}

export function createScalarHtml(documentPath: string, title: string): string {
  return `<!doctype html>
<html>
  <head>
    <title>${title}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="${documentPath}">
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
}
