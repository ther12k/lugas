/**
 * Request validation and guard pipeline compiler (M2-014).
 *
 * Assembles per-route validation and guard stages into a single execution function:
 * 1. Validate headers (if declared) -> short-circuit on 422
 * 2. Validate params (if declared) -> short-circuit on 422
 * 3. Validate query (if declared) -> short-circuit on 422
 * 4. Validate body (if declared) -> short-circuit on 415/400/422
 * 5. Run guards (if declared) -> short-circuit on Response
 * 6. Invoke user handler
 *
 * Preserves synchronous execution when all declared stages and the user handler
 * are synchronous.
 */
import type { GuardDescriptor, RouteDescriptor } from "../core/types";
import { validateHeaders } from "./validate-headers";
import { validateParams } from "./validate-params";
import { validateQuery } from "./validate-query";
import { validateBody } from "./validate-body";
import { runGuards } from "./run-guards";

export type PipelineContext = {
  request: Request;
  services: unknown;
  params: any;
  query?: unknown;
  headers?: unknown;
  body?: unknown;
  [key: string]: unknown;
};

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return false;
  return typeof (value as { readonly then?: unknown }).then === "function";
}

export function compilePipeline(
  routeId: string,
  descriptor: RouteDescriptor<never>,
  services: unknown,
): (request: Request) => Response | Promise<Response> {
  const {
    before: guards = [],
    params: paramsSchema,
    query: querySchema,
    headers: headersSchema,
    body: bodySchema,
  } = descriptor as any;

  const userHandler = descriptor.handler as (context: PipelineContext) => Response | Promise<Response>;
  const base = { services };

  const hasValidation =
    paramsSchema !== undefined ||
    querySchema !== undefined ||
    headersSchema !== undefined ||
    bodySchema !== undefined;

  const hasGuards = (guards as ReadonlyArray<GuardDescriptor<unknown, unknown>>).length > 0;

  // FAST PATH: No validation and no guards. One unified invocation path —
  // async-ness is observed from the returned value, never guessed from the
  // function's constructor (M4R1-004). Sync handlers stay promise-free.
  if (!hasValidation && !hasGuards) {
    return (request: Request) => {
      const rawParams = (request as Request & { params?: Record<string, string> }).params ?? {};
      const out = userHandler({ request, ...base, params: rawParams });
      if (isPromiseLike(out)) {
        return Promise.resolve(out).then((resolved) => {
          if (!(resolved instanceof Response)) {
            throw new TypeError(`Route ${routeId}: handler must return a native Response`);
          }
          return resolved;
        });
      }
      if (!(out instanceof Response)) {
        throw new TypeError(`Route ${routeId}: handler must return a native Response`);
      }
      return out;
    };
  }

  // If body schema is declared, request body reading is always asynchronous
  if (bodySchema !== undefined) {
    return async (request: Request) => {
      // 1. Headers validation
      let headersData: unknown = undefined;
      if (headersSchema !== undefined) {
        const hRes = await validateHeaders(headersSchema, request);
        if (!hRes.ok) return hRes.response;
        headersData = hRes.data;
      }

      // 2. Params validation
      const rawParams = (request as Request & { params?: Record<string, string> }).params ?? {};
      let paramsData: any = rawParams;
      if (paramsSchema !== undefined) {
        const pRes = await validateParams(paramsSchema, rawParams);
        if (!pRes.ok) return pRes.response;
        paramsData = pRes.data;
      }

      // 3. Query validation
      let queryData: unknown = undefined;
      if (querySchema !== undefined) {
        const qRes = await validateQuery(querySchema, request);
        if (!qRes.ok) return qRes.response;
        queryData = qRes.data;
      }

      // 4. Body validation
      const bRes = await validateBody(bodySchema, request);
      if (!bRes.ok) return bRes.response;
      const bodyData = bRes.data;

      // 5. Guards execution — guards receive the full validated context
      let guardContext: Record<string, unknown> = {};
      if (hasGuards) {
        const gRes = await runGuards(guards, {
          request,
          ...base,
          params: paramsData,
          ...(querySchema !== undefined ? { query: queryData } : {}),
          ...(headersSchema !== undefined ? { headers: headersData } : {}),
          ...(bodySchema !== undefined ? { body: bodyData } : {}),
        });
        if (gRes.kind === "response") return gRes.response;
        guardContext = gRes.context;
      }

      // 6. User handler — framework-owned keys applied last so validator
      // truth always reaches the handler (enrichment rejection is primary).
      const ctx: PipelineContext = {
        ...guardContext,
        request,
        ...base,
        params: paramsData,
        query: queryData,
        headers: headersData,
        body: bodyData,
      };
      const out = await userHandler(ctx);
      if (!(out instanceof Response)) {
        throw new TypeError(`Route ${routeId}: handler must return a native Response`);
      }
      return out;
    };
  }

  // Without body schema, try synchronous pipeline first
  return (request: Request) => {
    // 1. Headers validation
    let headersData: any = undefined;
    if (headersSchema !== undefined) {
      const hRes = validateHeaders(headersSchema, request);
      if (isPromiseLike(hRes)) {
        return Promise.resolve(hRes).then((resolvedH) => {
          if (!resolvedH.ok) return resolvedH.response;
          return executeAsyncPipeline(routeId, descriptor, services, request, { headers: resolvedH.data });
        });
      }
      if (!hRes.ok) return hRes.response;
      headersData = hRes.data;
    }

    // 2. Params validation
    const rawParams = (request as Request & { params?: Record<string, string> }).params ?? {};
    let paramsData: any = rawParams;
    if (paramsSchema !== undefined) {
      const pRes = validateParams(paramsSchema, rawParams);
      if (isPromiseLike(pRes)) {
        return Promise.resolve(pRes).then((resolvedP) => {
          if (!resolvedP.ok) return resolvedP.response;
          return executeAsyncPipeline(routeId, descriptor, services, request, {
            headers: headersData,
            params: resolvedP.data,
          });
        });
      }
      if (!pRes.ok) return pRes.response;
      paramsData = pRes.data;
    }

    // 3. Query validation
    let queryData: any = undefined;
    if (querySchema !== undefined) {
      const qRes = validateQuery(querySchema, request);
      if (isPromiseLike(qRes)) {
        return Promise.resolve(qRes).then((resolvedQ) => {
          if (!resolvedQ.ok) return resolvedQ.response;
          return executeAsyncPipeline(routeId, descriptor, services, request, {
            headers: headersData,
            params: paramsData,
            query: resolvedQ.data,
          });
        });
      }
      if (!qRes.ok) return qRes.response;
      queryData = qRes.data;
    }

    // 4. Guards execution — guards receive the full validated context
    let guardContext: Record<string, unknown> = {};
    if (hasGuards) {
      const guardInput: Record<string, unknown> = { request, ...base, params: paramsData };
      if (headersSchema !== undefined) guardInput.headers = headersData;
      if (querySchema !== undefined) guardInput.query = queryData;
      const gRes = runGuards(guards, guardInput);
      if (isPromiseLike(gRes)) {
        return Promise.resolve(gRes).then((resolvedG) => {
          if (resolvedG.kind === "response") return resolvedG.response;
          return executeAsyncHandler(routeId, userHandler, {
            ...resolvedG.context,
            request,
            ...base,
            params: paramsData,
            query: queryData,
            headers: headersData,
          });
        });
      }
      if (gRes.kind === "response") return gRes.response;
      guardContext = gRes.context;
    }

    // 5. User handler — framework-owned keys applied last
    const ctx: PipelineContext = {
      ...guardContext,
      request,
      ...base,
      params: paramsData,
      query: queryData,
      headers: headersData,
    };
    const out = userHandler(ctx);
    if (isPromiseLike(out)) {
      return Promise.resolve(out).then((resolvedOut) => {
        if (!(resolvedOut instanceof Response)) {
          throw new TypeError(`Route ${routeId}: handler must return a native Response`);
        }
        return resolvedOut;
      });
    }

    if (!(out instanceof Response)) {
      throw new TypeError(`Route ${routeId}: handler must return a native Response`);
    }
    return out;
  };
}

async function executeAsyncPipeline(
  routeId: string,
  descriptor: RouteDescriptor<never>,
  services: unknown,
  request: Request,
  partialContext: Partial<PipelineContext>,
): Promise<Response> {
  const { before: guards = [], params: paramsSchema, query: querySchema, headers: headersSchema } = descriptor as any;
  const completed = new Set<string>();
  const userHandler = descriptor.handler as (context: PipelineContext) => Response | Promise<Response>;
  const base = { services };

  let headersData = partialContext.headers;
  if (!completed.has('headers') && headersSchema !== undefined) {
    const hRes = await validateHeaders(headersSchema, request);
    if (!hRes.ok) return hRes.response;
    headersData = hRes.data;
    completed.add("headers");
  }

  const rawParams = (request as Request & { params?: Record<string, string> }).params ?? {};
  let paramsData = partialContext.params ?? rawParams;
  if (!completed.has('params') && paramsSchema !== undefined) {
    const pRes = await validateParams(paramsSchema, rawParams);
    if (!pRes.ok) return pRes.response;
    paramsData = pRes.data;
    completed.add("params");
  }

  let queryData = partialContext.query;
  if (!completed.has('query') && querySchema !== undefined) {
    const qRes = await validateQuery(querySchema, request);
    if (!qRes.ok) return qRes.response;
    queryData = qRes.data;
    completed.add("query");
  }

  let guardContext = {};
  if (guards.length > 0) {
    const gRes = await runGuards(guards, {
      request,
      ...base,
      params: paramsData,
      ...(querySchema !== undefined ? { query: queryData } : {}),
      ...(headersSchema !== undefined ? { headers: headersData } : {}),
    });
    if (gRes.kind === "response") return gRes.response;
    guardContext = gRes.context;
  }

  const ctx: PipelineContext = {
    ...guardContext,
    request,
    ...base,
    params: paramsData,
    query: queryData,
    headers: headersData,
  };
  return executeAsyncHandler(routeId, userHandler, ctx);
}

async function executeAsyncHandler(
  routeId: string,
  userHandler: (context: PipelineContext) => Response | Promise<Response>,
  ctx: PipelineContext,
): Promise<Response> {
  const out = await userHandler(ctx);
  if (!(out instanceof Response)) {
    throw new TypeError(`Route ${routeId}: handler must return a native Response`);
  }
  return out;
}
