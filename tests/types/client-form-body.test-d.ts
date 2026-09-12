/**
 * Multipart through the typed client (RF-3 roadmap item 3): form() routes
 * require a formBody() body in the contract, their framework failure branches
 * are 415/400/413 (never the JSON 400/422 body set), and the handler body
 * view is mode-typed (last-wins vs preserve groups).
 */
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { form } from "../../src/core/form";
import { json } from "../../src/core/response";
import { z } from "zod";
import type { AppContract } from "../../src/core/contract";
import type { ClientOutcomesFor, ClientCallResult, FrameworkProblemBody, MethodBodyInput } from "../../src/client/types";
import type { MultipartBody, MultipartBodyPreserved } from "../../src/core/form";
import type { RouteContext } from "../../src/internal/context";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const app = defineApp({
  routes: {
    "/upload": {
      POST: route({
        body: form({ repeated: "preserve", maxFileSize: 1024 }),
        handler: (ctx) => {
          type _body = Expect<Equal<typeof ctx.body, MultipartBodyPreserved>>;
          type _groups = Expect<Equal<typeof ctx.body.groups, { readonly [name: string]: ReadonlyArray<string | File> }>>;
          void ctx;
          return json(201, { stored: true });
        },
      }),
    },
    "/upload-last": {
      POST: route({
        body: form(),
        handler: (ctx) => {
          type _body = Expect<Equal<typeof ctx.body, MultipartBody>>;
          // last-wins mode exposes no groups property at all
          type _noGroups = Expect<Equal<"groups" extends keyof typeof ctx.body ? true : false, false>>;
          void ctx;
          return json(201, { stored: true });
        },
      }),
    },
    "/upload-with-params/:id": {
      POST: route({
        params: z.object({ id: z.string() }),
        body: form(),
        handler: (ctx) => {
          void ctx;
          return json(201, { stored: true });
        },
      }),
    },
  },
});
type Contract = AppContract<typeof app>;

// 1. The contract requires a formBody() wrapper body for form() routes.
type UploadInput = MethodBodyInput<Contract, "/upload", "POST">;
type _bodyRequired = Expect<Equal<"body" extends keyof UploadInput ? true : false, true>>;

// 2. Framework failure branches for a form route: 415/400/413 — no JSON
//    MALFORMED_JSON and no body-driven 422 (a form body has no schema).
type UploadOutcomes = ClientOutcomesFor<Contract, "/upload", "POST">;
type _uploadStatuses = Expect<Equal<UploadOutcomes["status"], 201 | 400 | 413 | 415>>;
type _malformedCode = Expect<Equal<Extract<UploadOutcomes, { status: 400 }>["body"]["code"], "MALFORMED_MULTIPART">>;
type _mediaCode = Expect<Equal<Extract<UploadOutcomes, { status: 415 }>["body"]["code"], "UNSUPPORTED_MEDIA_TYPE">>;

// 2b. The 413 payload is ABSENTABLE (CA-7): Lugas-level 413s carry the
//     Problem body, but the transport ceiling can bare-413 the same route
//     before the framework sees it. The type forces narrowing.
type Upload413 = Extract<UploadOutcomes, { status: 413 }>;
type _413Absentable = Expect<Equal<Upload413["body"], FrameworkProblemBody<"FORM_LIMIT_EXCEEDED" | "BODY_BUDGET_EXCEEDED", 413> | undefined>>;
declare const result413: Extract<ClientCallResult<Contract, "/upload", "POST">, { ok: false; status: 413 }>;
// @ts-expect-error Problem fields are unreachable without narrowing — the
// numeric status alone cannot distinguish Lugas 413s from a bare transport 413.
result413.error.code;
if (result413.error !== undefined) {
  const narrowed: "FORM_LIMIT_EXCEEDED" | "BODY_BUDGET_EXCEEDED" = result413.error.code;
  void narrowed;
}

// 3. Declared params on a form route still contribute 422 through their own branch.
type WithParamsOutcomes = ClientOutcomesFor<Contract, "/upload-with-params/:id", "POST">;
type _withParamsStatuses = Expect<Equal<WithParamsOutcomes["status"], 201 | 400 | 413 | 415 | 422>>;

// 4. The success side stays precisely typed: the Jsonify'd handler body
//    (literals widen at the wire, M6R11) — never `unknown`.
type UploadResult = ClientCallResult<Contract, "/upload", "POST">;
type UploadData = Extract<UploadResult, { ok: true }>["data"];
type _success = Expect<Equal<UploadData["stored"], boolean>>;
type _successKeyCount = Expect<Equal<keyof UploadData, "stored">>;
