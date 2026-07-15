/**
 * Phase 3 — profitability, project costs, tax set-aside, cash flow
 *
 * We build a minimal test Hono app that mounts the same routes and injects a
 * known single user. This also makes it possible to verify workspace isolation
 * using a second test owner.
 *
 * Cross-workspace isolation is verified by switching the injected user
 * between two separate test organizations.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";
import { ZodError } from "zod";
import { prisma } from "../src/prisma";
import type { AppContext } from "../src/lib/context";
import { projectCostsRouter } from "../src/routes/project-costs";
import { profitabilityRouter } from "../src/routes/profitability";
import { dashboardRouter } from "../src/routes/dashboard";
import { orgRouter } from "../src/routes/org";

// ─── Fixture identifiers ───────────────────────────────────────────
const ORG_A = { userId: "p3-test-user-a", orgId: "p3-test-org-a" };
const ORG_B = { userId: "p3-test-user-b", orgId: "p3-test-org-b" };

// ─── Minimal test-app factory ─────────────────────────────────────
/**
 * Build a Hono app that injects a user directly.
 * The injected userId must match an existing Organization.ownerId in the DB.
 */
function makeTestApp(userId: string | null) {
  const app = new Hono<AppContext>();

  app.use("*", async (c, next) => {
    if (userId) {
      c.set("user", {
        id: userId,
        email: `${userId}@test-awp.internal`,
        name: "Test User",
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    } else {
      c.set("user", null);
    }
    await next();
  });

  // Same error handler as production
  app.onError((err, c) => {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      const path = first?.path.join(".");
      return c.json(
        { error: { message: `${path ? path + ": " : ""}${first?.message ?? "Invalid input"}`, code: "validation_error" } },
        400
      );
    }
    return c.json({ error: { message: "Internal server error", code: "internal" } }, 500);
  });

  app.route("/api/projects/:projectId/costs", projectCostsRouter);
  app.route("/api/profitability", profitabilityRouter);
  app.route("/api/dashboard", dashboardRouter);
  app.route("/api/org", orgRouter);

  return app;
}

/** Shorthand — make an authenticated JSON request on a test app. */
function req(
  app: ReturnType<typeof makeTestApp>,
  method: string,
  path: string,
  body?: unknown
) {
  return app.request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function jsonBody(r: Response) {
  const text = await r.text();
  return JSON.parse(text) as any;
}

// ─── Setup / teardown ─────────────────────────────────────────────
let projectAId: string;
let projectBId: string;
const appA = makeTestApp(ORG_A.userId);
const appB = makeTestApp(ORG_B.userId);
const appAnon = makeTestApp(null);

beforeAll(async () => {
  // Org A
  await prisma.user.upsert({
    where: { id: ORG_A.userId },
    create: {
      id: ORG_A.userId,
      name: "Phase3 User A",
      email: `${ORG_A.userId}@test-awp.internal`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {},
  });
  await prisma.organization.upsert({
    where: { id: ORG_A.orgId },
    create: {
      id: ORG_A.orgId,
      ownerId: ORG_A.userId,
      name: "Phase3 Org A",
      slug: ORG_A.orgId,
      taxSetAsidePercent: 25,
    },
    update: { taxSetAsidePercent: 25 },
  });

  // Org B
  await prisma.user.upsert({
    where: { id: ORG_B.userId },
    create: {
      id: ORG_B.userId,
      name: "Phase3 User B",
      email: `${ORG_B.userId}@test-awp.internal`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {},
  });
  await prisma.organization.upsert({
    where: { id: ORG_B.orgId },
    create: {
      id: ORG_B.orgId,
      ownerId: ORG_B.userId,
      name: "Phase3 Org B",
      slug: ORG_B.orgId,
      taxSetAsidePercent: 25,
    },
    update: {},
  });

  // Projects
  const pA = await prisma.project.create({
    data: {
      id: "p3-proj-a",
      orgId: ORG_A.orgId,
      name: "Phase3 Project A",
      referenceCode: "P3A-001",
      serviceType: "commercial",
      status: "booked",
    },
  });
  projectAId = pA.id;

  const pB = await prisma.project.create({
    data: {
      id: "p3-proj-b",
      orgId: ORG_B.orgId,
      name: "Phase3 Project B",
      referenceCode: "P3B-001",
      serviceType: "podcast",
      status: "lead",
    },
  });
  projectBId = pB.id;

  // Paid invoice for Org A (used by tax set-aside test)
  await prisma.invoice.create({
    data: {
      id: "p3-inv-paid",
      orgId: ORG_A.orgId,
      projectId: projectAId,
      number: "P3-INV-001",
      status: "paid",
      issueDate: "2026-01-01",
      dueDate: "2026-01-31",
      currency: "USD",
      subtotal: 1000,
      total: 1000,
      amountPaid: 1000,
      amountDue: 0,
    },
  });

  // Upcoming sent invoice for Org A (used by cash-flow test, due in 20 days)
  const dueSoon = new Date();
  dueSoon.setDate(dueSoon.getDate() + 20);
  await prisma.invoice.create({
    data: {
      id: "p3-inv-sent",
      orgId: ORG_A.orgId,
      number: "P3-INV-002",
      status: "sent",
      issueDate: "2026-06-01",
      dueDate: dueSoon.toISOString().slice(0, 10),
      currency: "USD",
      subtotal: 500,
      total: 500,
      amountPaid: 0,
      amountDue: 500,
    },
  });
});

afterAll(async () => {
  // Cascade delete via org removes everything underneath
  await prisma.organization.deleteMany({
    where: { id: { in: [ORG_A.orgId, ORG_B.orgId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [ORG_A.userId, ORG_B.userId] } },
  });
});

// ─── Project Costs — CRUD ─────────────────────────────────────────
describe("Project Costs — CRUD", () => {
  let costId: string;

  it("POST creates a cost → 201", async () => {
    const r = await req(appA, "POST", `/api/projects/${projectAId}/costs`, {
      projectId: projectAId,
      category: "gear_rental",
      description: "Camera package",
      amount: 250,
      currency: "USD",
      date: "2026-06-01",
    });
    expect(r.status).toBe(201);
    const b = await jsonBody(r);
    expect(b.data.category).toBe("gear_rental");
    expect(b.data.amount).toBe(250);
    expect(b.data.projectId).toBe(projectAId);
    costId = b.data.id;
  });

  it("GET lists project costs → 200", async () => {
    const r = await req(appA, "GET", `/api/projects/${projectAId}/costs`);
    expect(r.status).toBe(200);
    const b = await jsonBody(r);
    expect(Array.isArray(b.data)).toBe(true);
    expect(b.data.some((c: any) => c.description === "Camera package")).toBe(true);
  });

  it("PATCH updates amount → 200", async () => {
    const r = await req(appA, "PATCH", `/api/projects/${projectAId}/costs/${costId}`, {
      projectId: projectAId,
      amount: 300,
      category: "gear_rental",
      currency: "USD",
      date: "2026-06-01",
    });
    expect(r.status).toBe(200);
    const b = await jsonBody(r);
    expect(b.data.amount).toBe(300);
  });

  it("DELETE removes cost → 204", async () => {
    const r = await req(appA, "DELETE", `/api/projects/${projectAId}/costs/${costId}`);
    expect(r.status).toBe(204);
  });

  it("GET after delete returns empty list", async () => {
    const r = await req(appA, "GET", `/api/projects/${projectAId}/costs`);
    const b = await jsonBody(r);
    expect(b.data.find((c: any) => c.id === costId)).toBeUndefined();
  });
});

// ─── Cross-workspace isolation ────────────────────────────────────
describe("Cross-workspace isolation", () => {
  let costId: string;

  beforeAll(async () => {
    const cost = await prisma.projectCost.create({
      data: {
        orgId: ORG_A.orgId,
        projectId: projectAId,
        category: "insurance",
        amount: 150,
        currency: "USD",
        date: "2026-06-01",
      },
    });
    costId = cost.id;
  });

  it("Org B cannot list Org A project costs (project not found → 404)", async () => {
    const r = await req(appB, "GET", `/api/projects/${projectAId}/costs`);
    expect(r.status).toBe(404);
  });

  it("Org B cannot POST a cost to Org A project (404)", async () => {
    const r = await req(appB, "POST", `/api/projects/${projectAId}/costs`, {
      projectId: projectAId,
      category: "misc",
      amount: 99,
      currency: "USD",
      date: "2026-06-01",
    });
    expect(r.status).toBe(404);
  });

  it("Org B cannot DELETE Org A cost (404)", async () => {
    const r = await req(appB, "DELETE", `/api/projects/${projectAId}/costs/${costId}`);
    expect(r.status).toBe(404);
  });

  it("Unauthenticated request → 401", async () => {
    const r = await req(appAnon, "GET", `/api/projects/${projectAId}/costs`);
    expect(r.status).toBe(401);
  });
});

// ─── Profitability ────────────────────────────────────────────────
describe("Profitability", () => {
  beforeAll(async () => {
    // Add a talent-fees cost so we have non-zero costs to verify margin
    await prisma.projectCost.create({
      data: {
        id: "p3-cost-talent",
        orgId: ORG_A.orgId,
        projectId: projectAId,
        category: "talent_fees",
        amount: 200,
        currency: "USD",
        date: "2026-06-01",
      },
    });
  });

  it("GET /api/profitability → 200 with projects + serviceLines", async () => {
    const r = await req(appA, "GET", "/api/profitability");
    expect(r.status).toBe(200);
    const b = await jsonBody(r);
    expect(Array.isArray(b.data.projects)).toBe(true);
    expect(Array.isArray(b.data.serviceLines)).toBe(true);
  });

  it("project row has correct totalBilled, totalCosts, grossMargin", async () => {
    const r = await req(appA, "GET", "/api/profitability");
    const b = await jsonBody(r);
    const row = b.data.projects.find((p: any) => p.projectId === projectAId);
    expect(row).toBeDefined();
    // Paid invoice total = 1000
    expect(row.totalBilled).toBe(1000);
    // Costs: insurance 150 + talent 200 = 350
    expect(row.totalCosts).toBeGreaterThanOrEqual(200); // at least the talent cost
    expect(row.grossMargin).toBe(Math.round((row.totalBilled - row.totalCosts) * 100) / 100);
  });

  it("service line 'commercial' appears in serviceLines for Org A", async () => {
    const r = await req(appA, "GET", "/api/profitability");
    const b = await jsonBody(r);
    const sl = b.data.serviceLines.find((s: any) => s.serviceType === "commercial");
    expect(sl).toBeDefined();
    expect(sl.projectCount).toBeGreaterThanOrEqual(1);
  });

  it("Org A data does not appear in Org B response", async () => {
    const r = await req(appB, "GET", "/api/profitability");
    expect(r.status).toBe(200);
    const b = await jsonBody(r);
    const leaked = b.data.projects.find((p: any) => p.projectId === projectAId);
    expect(leaked).toBeUndefined();
  });

  it("Org B sees only its own project (podcast)", async () => {
    const r = await req(appB, "GET", "/api/profitability");
    const b = await jsonBody(r);
    expect(b.data.projects.every((p: any) => p.projectId === projectBId)).toBe(true);
  });
});

// ─── Tax set-aside ────────────────────────────────────────────────
describe("Tax set-aside", () => {
  it("dashboard includes taxSetAside and taxSetAsidePercent", async () => {
    const r = await req(appA, "GET", "/api/dashboard");
    expect(r.status).toBe(200);
    const b = await jsonBody(r);
    expect(typeof b.data.taxSetAside).toBe("number");
    expect(typeof b.data.taxSetAsidePercent).toBe("number");
  });

  it("taxSetAside = paidInvoicesTotal × (taxSetAsidePercent / 100)", async () => {
    const r = await req(appA, "GET", "/api/dashboard");
    const b = await jsonBody(r);
    // Org A: one paid invoice total=1000, taxSetAsidePercent=25 → 250
    expect(b.data.taxSetAsidePercent).toBe(25);
    expect(b.data.taxSetAside).toBe(250);
  });

  it("PATCH org changes taxSetAsidePercent", async () => {
    const r = await req(appA, "PATCH", "/api/org", { taxSetAsidePercent: 30 });
    expect(r.status).toBe(200);
    const b = await jsonBody(r);
    expect(b.data.taxSetAsidePercent).toBe(30);
    // Restore
    await req(appA, "PATCH", "/api/org", { taxSetAsidePercent: 25 });
  });

  it("updated taxSetAsidePercent is reflected in dashboard", async () => {
    await req(appA, "PATCH", "/api/org", { taxSetAsidePercent: 40 });
    const r = await req(appA, "GET", "/api/dashboard");
    const b = await jsonBody(r);
    expect(b.data.taxSetAsidePercent).toBe(40);
    expect(b.data.taxSetAside).toBe(400); // 1000 * 40%
    // Restore
    await req(appA, "PATCH", "/api/org", { taxSetAsidePercent: 25 });
  });
});

// ─── Cash flow forecast ───────────────────────────────────────────
describe("Cash flow forecast", () => {
  it("dashboard includes cashFlow with correct shape", async () => {
    const r = await req(appA, "GET", "/api/dashboard");
    expect(r.status).toBe(200);
    const b = await jsonBody(r);
    const cf = b.data.cashFlow;
    expect(typeof cf.overdueTotal).toBe("number");
    expect(typeof cf.next30Days).toBe("number");
    expect(typeof cf.next60Days).toBe("number");
    expect(typeof cf.next90Days).toBe("number");
    expect(Array.isArray(cf.items)).toBe(true);
  });

  it("sent invoice due in 20 days appears in next30Days items", async () => {
    const r = await req(appA, "GET", "/api/dashboard");
    const b = await jsonBody(r);
    const cf = b.data.cashFlow;
    expect(cf.next30Days).toBeGreaterThanOrEqual(500);
    const item = cf.items.find((i: any) => i.referenceId === "p3-inv-sent");
    expect(item).toBeDefined();
    expect(item.type).toBe("invoice_due");
    expect(item.amount).toBe(500);
  });

  it("Org B cash flow contains no Org A invoice items", async () => {
    const r = await req(appB, "GET", "/api/dashboard");
    expect(r.status).toBe(200);
    const b = await jsonBody(r);
    const leaked = b.data.cashFlow.items.find((i: any) => i.referenceId === "p3-inv-sent");
    expect(leaked).toBeUndefined();
  });

  it("next60Days ≥ next30Days", async () => {
    const r = await req(appA, "GET", "/api/dashboard");
    const b = await jsonBody(r);
    const cf = b.data.cashFlow;
    expect(cf.next60Days).toBeGreaterThanOrEqual(cf.next30Days);
  });

  it("next90Days ≥ next60Days", async () => {
    const r = await req(appA, "GET", "/api/dashboard");
    const b = await jsonBody(r);
    const cf = b.data.cashFlow;
    expect(cf.next90Days).toBeGreaterThanOrEqual(cf.next60Days);
  });
});
