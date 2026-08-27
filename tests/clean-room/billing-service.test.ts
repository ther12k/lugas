/**
 * Clean-Room Agent Integration Proof (M6-008).
 *
 * Implements a complete multi-tenant billing & invoice management service
 * using only the public LugasJS API surface (documented in `llms-full.txt`
 * and `skills/lugas/SKILL.md`):
 * - Typed services dependency injection (database + payment provider)
 * - Ordered authentication & tenant isolation guards with context enrichment
 * - Standard Schema validation (Zod) on path params, query strings, headers, and request bodies
 * - Discriminated responses (201 Created, 200 OK, 401/403/404 Problem Details)
 * - Safe test-server lifecycle and end-to-end typed client assertions
 * - Manifest truthfulness verification without server startup
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  defineApp,
  defineModule,
  guard,
  route,
  json,
  problem,
  type TypedResponse,
} from "../../src/index";
import { createTestServer } from "../../src/testing/index";

// ---------------------------------------------------------------------------
// Domain Types & Service Interfaces
// ---------------------------------------------------------------------------
type Invoice = {
  id: string;
  orgId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  description: string;
  status: "open" | "paid" | "void";
  createdAt: string;
};

type UserSession = {
  id: string;
  role: "admin" | "member";
  accessibleOrgs: string[];
};

type BillingDatabase = {
  invoices: Map<string, Invoice>;
  sessions: Map<string, UserSession>;
};

type PaymentGateway = {
  processPayment: (invoiceId: string, amount: number) => Promise<{ success: boolean; transactionId: string }>;
};

type BillingServices = {
  db: BillingDatabase;
  payments: PaymentGateway;
};

// ---------------------------------------------------------------------------
// Schemas (Zod Standard Schema v1)
// ---------------------------------------------------------------------------
const AuthHeaders = z.object({
  authorization: z.string().optional(),
});

const CreateInvoiceBody = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).toUpperCase(),
  customerEmail: z.string().email(),
  description: z.string().min(1).max(200),
});

const ListInvoicesQuery = z.object({
  status: z.enum(["all", "open", "paid", "void"]).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const InvoiceParams = z.object({
  orgId: z.string().min(1),
  invoiceId: z.string().min(1),
});

const OrgParams = z.object({
  orgId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Guards with Context Enrichment
// ---------------------------------------------------------------------------
const authGuard = guard({
  name: "authGuard",
  handler: (ctx: { request: Request; services: unknown }) => {
    const services = ctx.services as BillingServices;
    const authHeader = ctx.request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json(401, {
        type: "https://lugasjs.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
        detail: "Bearer token required in Authorization header",
      });
    }
    const token = authHeader.slice(7);
    const session = services.db.sessions.get(token);
    if (!session) {
      return json(401, {
        type: "https://lugasjs.dev/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        code: "INVALID_TOKEN",
        detail: "Session not found or expired",
      });
    }
    return { user: session };
  },
});

const tenantGuard = guard({
  name: "tenantGuard",
  handler: (ctx: { request: Request; services: unknown; [key: string]: unknown }) => {
    const user = ctx.user as UserSession | undefined;
    const params = ctx.params as { orgId?: string } | undefined;
    const requestedOrg = params?.orgId;

    if (!user || !requestedOrg) {
      return json(403, {
        type: "https://lugasjs.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        code: "MISSING_TENANT_CONTEXT",
      });
    }

    if (!user.accessibleOrgs.includes(requestedOrg)) {
      return json(403, {
        type: "https://lugasjs.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        code: "TENANT_ACCESS_DENIED",
        detail: `User does not have access to organization '${requestedOrg}'`,
      });
    }

    return {
      tenant: {
        orgId: requestedOrg,
        tier: (requestedOrg.startsWith("ent_") ? "enterprise" : "standard") as "enterprise" | "standard",
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Invoice Module Definition
// ---------------------------------------------------------------------------
const invoiceModule = defineModule({
  name: "invoices",
  routes: {
    "/api/orgs/:orgId/invoices": {
      GET: route({
        before: [authGuard, tenantGuard],
        headers: AuthHeaders,
        params: OrgParams,
        query: ListInvoicesQuery,
        handler: (ctx) => {
          const services = ctx.services as BillingServices;
          const orgId = ctx.params.orgId;
          const query = ctx.query ?? {};
          const all = Array.from(services.db.invoices.values()).filter(
            (inv: Invoice) => inv.orgId === orgId,
          );
          const filtered = query.status && query.status !== "all"
            ? all.filter((inv: Invoice) => inv.status === query.status)
            : all;
          const limited = query.limit ? filtered.slice(0, query.limit) : filtered;

          return json(200, {
            invoices: limited,
            total: filtered.length,
            tenantTier: (ctx as { tenant: { tier: string } }).tenant.tier,
          });
        },
      }),
      POST: route({
        before: [authGuard, tenantGuard],
        headers: AuthHeaders,
        params: OrgParams,
        body: CreateInvoiceBody,
        handler: (ctx): TypedResponse<201, Invoice> => {
          const services = ctx.services as BillingServices;
          const body = ctx.body;
          const invoice: Invoice = {
            id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            orgId: ctx.params.orgId,
            amount: body.amount,
            currency: body.currency,
            customerEmail: body.customerEmail,
            description: body.description,
            status: "open",
            createdAt: new Date().toISOString(),
          };
          services.db.invoices.set(invoice.id, invoice);
          return json(201, invoice);
        },
      }),
    },
    "/api/orgs/:orgId/invoices/:invoiceId": {
      GET: route({
        before: [authGuard, tenantGuard],
        headers: AuthHeaders,
        params: InvoiceParams,
        handler: (ctx) => {
          const services = ctx.services as BillingServices;
          const { orgId, invoiceId } = ctx.params;
          const invoice = services.db.invoices.get(invoiceId);
          if (!invoice || invoice.orgId !== orgId) {
            return problem(404, {
              title: "Invoice Not Found",
              detail: `Invoice '${invoiceId}' was not found in organization '${orgId}'`,
            });
          }
          return json(200, invoice);
        },
      }),
    },
  },
});

// ---------------------------------------------------------------------------
// Application Factory Fixture
// ---------------------------------------------------------------------------
function createBillingApp() {
  const db: BillingDatabase = {
    invoices: new Map(),
    sessions: new Map([
      ["token_admin_org1", { id: "usr_admin", role: "admin", accessibleOrgs: ["org_alpha", "ent_beta"] }],
      ["token_member_org1", { id: "usr_member", role: "member", accessibleOrgs: ["org_alpha"] }],
    ]),
  };

  const payments: PaymentGateway = {
    processPayment: async (invoiceId, amount) => ({
      success: true,
      transactionId: `txn_${invoiceId}_${amount}`,
    }),
  };

  const app = defineApp({
    services: { db, payments },
    modules: [invoiceModule],
    routes: {
      "/health": {
        GET: route({
          handler: () => json(200, { status: "healthy", timestamp: new Date().toISOString() }),
        }),
      },
    },
  });

  return { app, db, payments };
}

// ---------------------------------------------------------------------------
// Integration Test Suite
// ---------------------------------------------------------------------------
describe("Clean-Room Billing Service Application (M6-008)", () => {
  test("creates an invoice with typed body, guards, and 201 response", async () => {
    const { app } = createBillingApp();
    const server = createTestServer(app);
    try {
      const res = await server.client.post("/api/orgs/:orgId/invoices", {
        params: { orgId: "org_alpha" },
        headers: { authorization: "Bearer token_admin_org1" },
        body: {
          amount: 499.99,
          currency: "USD",
          customerEmail: "acme@example.com",
          description: "Enterprise Subscription - Monthly",
        },
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.status).toBe(201);
        expect(res.data.id).toStartWith("inv_");
        expect(res.data.orgId).toBe("org_alpha");
        expect(res.data.amount).toBe(499.99);
        expect(res.data.currency).toBe("USD");
        expect(res.data.status).toBe("open");
      }
    } finally {
      await server.stop();
    }
  });

  test("lists invoices filtered by query parameters and enriches tenant context", async () => {
    const { app, db } = createBillingApp();
    // Seed invoices
    db.invoices.set("inv_1", {
      id: "inv_1",
      orgId: "ent_beta",
      amount: 100,
      currency: "USD",
      customerEmail: "client@test.com",
      description: "Service fee",
      status: "paid",
      createdAt: new Date().toISOString(),
    });
    db.invoices.set("inv_2", {
      id: "inv_2",
      orgId: "ent_beta",
      amount: 200,
      currency: "USD",
      customerEmail: "client2@test.com",
      description: "Setup fee",
      status: "open",
      createdAt: new Date().toISOString(),
    });

    const server = createTestServer(app);
    try {
      const res = await server.client.get("/api/orgs/:orgId/invoices", {
        params: { orgId: "ent_beta" },
        headers: { authorization: "Bearer token_admin_org1" },
        query: { status: "paid", limit: 10 },
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        const body = res.data as { invoices: Invoice[]; total: number; tenantTier: string };
        expect(body.invoices.length).toBe(1);
        expect(body.invoices[0]?.id).toBe("inv_1");
        expect(body.tenantTier).toBe("enterprise");
      }
    } finally {
      await server.stop();
    }
  });

  test("retrieves a single invoice by ID", async () => {
    const { app, db } = createBillingApp();
    db.invoices.set("inv_target", {
      id: "inv_target",
      orgId: "org_alpha",
      amount: 75.5,
      currency: "EUR",
      customerEmail: "target@test.com",
      description: "Support addon",
      status: "open",
      createdAt: new Date().toISOString(),
    });

    const server = createTestServer(app);
    try {
      const res = await server.client.get("/api/orgs/:orgId/invoices/:invoiceId", {
        params: { orgId: "org_alpha", invoiceId: "inv_target" },
        headers: { authorization: "Bearer token_member_org1" },
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.status).toBe(200);
        const inv = res.data as Invoice;
        expect(inv.id).toBe("inv_target");
        expect(inv.amount).toBe(75.5);
      }
    } finally {
      await server.stop();
    }
  });

  test("short-circuits with 401 when Authorization header is absent", async () => {
    const { app } = createBillingApp();
    const server = createTestServer(app);
    try {
      const res = await server.fetch("/api/orgs/org_alpha/invoices", {
        method: "GET",
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe("UNAUTHORIZED");
    } finally {
      await server.stop();
    }
  });

  test("short-circuits with 403 when user attempts cross-tenant access", async () => {
    const { app } = createBillingApp();
    const server = createTestServer(app);
    try {
      // usr_member only has access to "org_alpha", attempting to access "ent_beta"
      const res = await server.client.get("/api/orgs/:orgId/invoices", {
        params: { orgId: "ent_beta" },
        headers: { authorization: "Bearer token_member_org1" },
        query: {},
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(403);
        const error = res.error as { code: string; detail: string };
        expect(error.code).toBe("TENANT_ACCESS_DENIED");
      }
    } finally {
      await server.stop();
    }
  });

  test("returns 404 Problem Details when invoice does not exist", async () => {
    const { app } = createBillingApp();
    const server = createTestServer(app);
    try {
      const res = await server.client.get("/api/orgs/:orgId/invoices/:invoiceId", {
        params: { orgId: "org_alpha", invoiceId: "nonexistent_inv" },
        headers: { authorization: "Bearer token_member_org1" },
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(404);
        expect(res.response.headers.get("content-type")).toContain("application/problem+json");
      }
    } finally {
      await server.stop();
    }
  });

  test("rejects invalid request body with 422 Problem Details", async () => {
    const { app } = createBillingApp();
    const server = createTestServer(app);
    try {
      const res = await server.client.post("/api/orgs/:orgId/invoices", {
        params: { orgId: "org_alpha" },
        headers: { authorization: "Bearer token_admin_org1" },
        body: {
          amount: -50, // Invalid: positive number required
          currency: "TOOLONG", // Invalid: 3 characters required
          customerEmail: "invalid-email-format", // Invalid email
          description: "", // Invalid: min length 1
        },
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(422 as never);
        const err = res.error as unknown as { code: string; source: string; issues: unknown[] };
        expect(err.code).toBe("VALIDATION_FAILED");
        expect(err.source).toBe("body");
        expect(Array.isArray(err.issues)).toBe(true);
        expect(err.issues.length).toBeGreaterThanOrEqual(4);
      }
    } finally {
      await server.stop();
    }
  });

  test("manifest reflects module, routes, validators, and ordered guards truthfully", () => {
    const { app } = createBillingApp();
    const manifest = app.manifest;

    expect(manifest.format).toBe("lugas-manifest-v1");
    expect(manifest.modules).toHaveLength(1);
    expect(manifest.modules[0]?.name).toBe("invoices");

    // Route inspection
    const postRoute = manifest.routes.find(
      (r) => r.path === "/api/orgs/:orgId/invoices" && r.method === "POST",
    );
    expect(postRoute).toBeDefined();
    expect(postRoute?.module).toBe("invoices");
    expect(postRoute?.guards).toEqual(["authGuard", "tenantGuard"]);
    expect(postRoute?.validates).toContain("body");
    expect(postRoute?.validates).toContain("params");
    expect(postRoute?.validates).toContain("headers");

    const getRoute = manifest.routes.find(
      (r) => r.path === "/api/orgs/:orgId/invoices" && r.method === "GET",
    );
    expect(getRoute).toBeDefined();
    expect(getRoute?.validates).toContain("query");
    expect(getRoute?.validates).toContain("params");
    expect(getRoute?.validates).toContain("headers");

    const healthRoute = manifest.routes.find((r) => r.path === "/health");
    expect(healthRoute).toBeDefined();
    expect(healthRoute?.module).toBeNull();
    expect(healthRoute?.guards).toEqual([]);
  });
});
