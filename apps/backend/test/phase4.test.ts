/**
 * Phase 4 — deliverable catalog, naming scheme, auto-tags, receipt inbox.
 *
 * Same mock-auth test harness as phase3: Better Auth HMAC-signs session
 * cookies, so we mount the real routers behind a middleware that injects a
 * known user directly. Cross-workspace isolation is verified by switching the
 * injected user between two separate organizations.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";
import { ZodError } from "zod";
import { prisma } from "../src/prisma";
import type { AppContext } from "../src/lib/context";
import { suggestDeliverableName } from "../src/types";
import { deliverablesRouter } from "../src/routes/deliverables";
import { costsRouter } from "../src/routes/costs";
import { aiRouter } from "../src/routes/ai";

const ORG_A = { userId: "p4-test-user-a", orgId: "p4-test-org-a" };
const ORG_B = { userId: "p4-test-user-b", orgId: "p4-test-org-b" };

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
    c.set("session", null as any);
    await next();
  });

  app.onError((err, c) => {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      const path = first?.path.join(".");
      return c.json(
        {
          error: {
            message: `${path ? path + ": " : ""}${first?.message ?? "Invalid input"}`,
            code: "validation_error",
          },
        },
        400
      );
    }
    return c.json({ error: { message: "Internal server error", code: "internal" } }, 500);
  });

  app.route("/api/deliverables", deliverablesRouter);
  app.route("/api/costs", costsRouter);
  app.route("/api/ai", aiRouter);
  return app;
}

function req(app: ReturnType<typeof makeTestApp>, method: string, path: string, body?: unknown) {
  return app.request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function jsonBody(r: Response) {
  return JSON.parse(await r.text()) as any;
}

const appA = makeTestApp(ORG_A.userId);
const appB = makeTestApp(ORG_B.userId);
const appAnon = makeTestApp(null);

let projectAId: string;
let projectBId: string;
let invoiceAId: string;
// Dedicated, pristine project for the version-increment CRUD tests. Bun runs
// EVERY beforeAll (incl. nested describes) before any test, so the shared
// project p4-proj-a gets a deliverable from the isolation suite's beforeAll —
// using a separate project here keeps version numbering deterministic.
const catProjectId = "p4-proj-cat";

beforeAll(async () => {
  // Org A + user
  await prisma.user.upsert({
    where: { id: ORG_A.userId },
    create: {
      id: ORG_A.userId,
      name: "Phase4 User A",
      email: `${ORG_A.userId}@test-awp.internal`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {},
  });
  await prisma.organization.upsert({
    where: { id: ORG_A.orgId },
    create: { id: ORG_A.orgId, ownerId: ORG_A.userId, name: "Phase4 Org A", slug: ORG_A.orgId },
    update: {},
  });

  // Org B + user
  await prisma.user.upsert({
    where: { id: ORG_B.userId },
    create: {
      id: ORG_B.userId,
      name: "Phase4 User B",
      email: `${ORG_B.userId}@test-awp.internal`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {},
  });
  await prisma.organization.upsert({
    where: { id: ORG_B.orgId },
    create: { id: ORG_B.orgId, ownerId: ORG_B.userId, name: "Phase4 Org B", slug: ORG_B.orgId },
    update: {},
  });

  const pA = await prisma.project.create({
    data: {
      id: "p4-proj-a",
      orgId: ORG_A.orgId,
      name: "Phase4 Project A",
      referenceCode: "P4A-001",
      serviceType: "commercial",
      status: "delivered",
    },
  });
  projectAId = pA.id;

  const pB = await prisma.project.create({
    data: {
      id: "p4-proj-b",
      orgId: ORG_B.orgId,
      name: "Phase4 Project B",
      referenceCode: "P4B-001",
      serviceType: "podcast",
      status: "booked",
    },
  });
  projectBId = pB.id;

  // Pristine project used only by the CRUD/versioning describe.
  await prisma.project.create({
    data: {
      id: catProjectId,
      orgId: ORG_A.orgId,
      name: "Phase4 Catalog Project",
      referenceCode: "P4CAT-001",
      serviceType: "commercial",
      status: "delivered",
    },
  });

  const inv = await prisma.invoice.create({
    data: {
      id: "p4-inv-a",
      orgId: ORG_A.orgId,
      projectId: projectAId,
      number: "P4-INV-001",
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
  invoiceAId = inv.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: [ORG_A.orgId, ORG_B.orgId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ORG_A.userId, ORG_B.userId] } } });
});

// ─── Naming scheme (pure unit) ────────────────────────────────────
describe("Naming scheme", () => {
  it("builds <REF>_<CODE>_v<N>", () => {
    expect(suggestDeliverableName("AWP-0007", "final_video", 2)).toBe("AWP-0007_VID_v2");
    expect(suggestDeliverableName("p4a 001", "voiceover_take", 1)).toBe("P4A-001_VO_v1");
    expect(suggestDeliverableName("", "podcast_episode", 1)).toBe("ASSET_POD_v1");
  });

  it("falls back to AST for unknown types and clamps bad versions", () => {
    expect(suggestDeliverableName("X1", "mystery", 0)).toBe("X1_AST_v1");
  });
});

// ─── Deliverables CRUD + auto-name + auto-tag ─────────────────────
describe("Deliverables — CRUD, naming, auto-tags", () => {
  let id1: string;
  let id2: string;

  it("POST creates a deliverable, auto-names v1, auto-applies tags", async () => {
    const r = await req(appA, "POST", "/api/deliverables", {
      projectId: catProjectId,
      assetType: "final_video",
      invoiceId: invoiceAId,
    });
    expect(r.status).toBe(201);
    const b = await jsonBody(r);
    expect(b.data.name).toBe("P4CAT-001_VID_v1");
    expect(b.data.version).toBe(1);
    expect(b.data.invoice.number).toBe("P4-INV-001");
    // Auto tags: asset-type "Final video" + service-line "Commercial"
    const tagNames = b.data.tags.map((t: any) => t.name).sort();
    expect(tagNames).toContain("Final video");
    expect(tagNames).toContain("Commercial");
    id1 = b.data.id;
  });

  it("POST a second video increments the version to v2", async () => {
    const r = await req(appA, "POST", "/api/deliverables", {
      projectId: catProjectId,
      assetType: "final_video",
    });
    const b = await jsonBody(r);
    expect(b.data.name).toBe("P4CAT-001_VID_v2");
    expect(b.data.version).toBe(2);
    id2 = b.data.id;
  });

  it("a different asset type restarts at v1", async () => {
    const r = await req(appA, "POST", "/api/deliverables", {
      projectId: catProjectId,
      assetType: "drone_footage",
    });
    const b = await jsonBody(r);
    expect(b.data.name).toBe("P4CAT-001_DRN_v1");
  });

  it("an explicit name is respected", async () => {
    const r = await req(appA, "POST", "/api/deliverables", {
      projectId: catProjectId,
      assetType: "photo",
      name: "Hero shot final",
    });
    const b = await jsonBody(r);
    expect(b.data.name).toBe("Hero shot final");
  });

  it("GET lists the org's deliverables", async () => {
    const r = await req(appA, "GET", "/api/deliverables");
    expect(r.status).toBe(200);
    const b = await jsonBody(r);
    expect(b.data.length).toBeGreaterThanOrEqual(4);
    // Every returned deliverable belongs to this org's projects.
    const orgProjects = new Set([projectAId, catProjectId]);
    expect(b.data.every((d: any) => orgProjects.has(d.projectId))).toBe(true);
  });

  it("GET ?projectId filters to one project", async () => {
    const r = await req(appA, "GET", `/api/deliverables?projectId=${catProjectId}`);
    const b = await jsonBody(r);
    expect(b.data.length).toBeGreaterThanOrEqual(3);
    expect(b.data.every((d: any) => d.projectId === catProjectId)).toBe(true);
  });

  it("PUT updates status and file metadata", async () => {
    const r = await req(appA, "PUT", `/api/deliverables/${id1}`, {
      projectId: catProjectId,
      assetType: "final_video",
      status: "delivered",
      fileFormat: "ProRes",
      fileSize: "2.4 GB",
      deliveredAt: "2026-02-01",
      version: 1,
    });
    expect(r.status).toBe(200);
    const b = await jsonBody(r);
    expect(b.data.status).toBe("delivered");
    expect(b.data.fileFormat).toBe("ProRes");
    expect(b.data.deliveredAt).toBe("2026-02-01");
  });

  it("DELETE removes a deliverable → 204", async () => {
    const r = await req(appA, "DELETE", `/api/deliverables/${id2}`);
    expect(r.status).toBe(204);
    const list = await jsonBody(await req(appA, "GET", "/api/deliverables"));
    expect(list.data.find((d: any) => d.id === id2)).toBeUndefined();
  });
});

// ─── Validation / edge cases ──────────────────────────────────────
describe("Deliverables — validation", () => {
  it("rejects an invalid assetType → 400", async () => {
    const r = await req(appA, "POST", "/api/deliverables", {
      projectId: projectAId,
      assetType: "hologram",
    });
    expect(r.status).toBe(400);
  });

  it("rejects an invalid status → 400", async () => {
    const r = await req(appA, "POST", "/api/deliverables", {
      projectId: projectAId,
      assetType: "photo",
      status: "shipped",
    });
    expect(r.status).toBe(400);
  });

  it("rejects a missing projectId → 400", async () => {
    const r = await req(appA, "POST", "/api/deliverables", { assetType: "photo" });
    expect(r.status).toBe(400);
  });

  it("404s when the project does not exist", async () => {
    const r = await req(appA, "POST", "/api/deliverables", {
      projectId: "does-not-exist",
      assetType: "photo",
    });
    expect(r.status).toBe(404);
  });
});

// ─── Cross-workspace isolation ────────────────────────────────────
describe("Cross-workspace isolation", () => {
  let aDeliverableId: string;

  beforeAll(async () => {
    const d = await prisma.deliverable.create({
      data: {
        orgId: ORG_A.orgId,
        projectId: projectAId,
        name: "ISO-TEST_VID_v1",
        assetType: "final_video",
        status: "draft",
        version: 1,
      },
    });
    aDeliverableId = d.id;
  });

  it("Org B cannot create a deliverable on Org A's project (404)", async () => {
    const r = await req(appB, "POST", "/api/deliverables", {
      projectId: projectAId,
      assetType: "final_video",
    });
    expect(r.status).toBe(404);
  });

  it("Org B cannot link Org A's invoice to its own deliverable (404)", async () => {
    const r = await req(appB, "POST", "/api/deliverables", {
      projectId: projectBId,
      assetType: "podcast_episode",
      invoiceId: invoiceAId,
    });
    expect(r.status).toBe(404);
  });

  it("Org B cannot update Org A's deliverable (404)", async () => {
    const r = await req(appB, "PUT", `/api/deliverables/${aDeliverableId}`, {
      projectId: projectBId,
      assetType: "final_video",
    });
    expect(r.status).toBe(404);
  });

  it("Org B cannot delete Org A's deliverable (404)", async () => {
    const r = await req(appB, "DELETE", `/api/deliverables/${aDeliverableId}`);
    expect(r.status).toBe(404);
  });

  it("Org A's deliverables never appear in Org B's list", async () => {
    const r = await req(appB, "GET", "/api/deliverables");
    const b = await jsonBody(r);
    expect(b.data.find((d: any) => d.id === aDeliverableId)).toBeUndefined();
  });

  it("unauthenticated request → 401", async () => {
    const r = await req(appAnon, "GET", "/api/deliverables");
    expect(r.status).toBe(401);
  });
});

// ─── Costs feed (receipt inbox) ───────────────────────────────────
describe("Costs feed", () => {
  beforeAll(async () => {
    await prisma.projectCost.create({
      data: {
        orgId: ORG_A.orgId,
        projectId: projectAId,
        category: "gear_rental",
        description: "Vendor X — camera",
        amount: 320,
        currency: "USD",
        date: "2026-03-01",
      },
    });
    await prisma.projectCost.create({
      data: {
        orgId: ORG_B.orgId,
        projectId: projectBId,
        category: "talent_fees",
        amount: 500,
        currency: "USD",
        date: "2026-03-02",
      },
    });
  });

  it("GET /api/costs returns the org's costs with project context", async () => {
    const r = await req(appA, "GET", "/api/costs");
    expect(r.status).toBe(200);
    const b = await jsonBody(r);
    const row = b.data.find((c: any) => c.description === "Vendor X — camera");
    expect(row).toBeDefined();
    expect(row.referenceCode).toBe("P4A-001");
    expect(row.projectName).toBe("Phase4 Project A");
  });

  it("Org B's costs never leak into Org A's feed", async () => {
    const r = await req(appA, "GET", "/api/costs");
    const b = await jsonBody(r);
    expect(b.data.every((c: any) => c.referenceCode !== "P4B-001")).toBe(true);
  });

  it("unauthenticated → 401", async () => {
    const r = await req(appAnon, "GET", "/api/costs");
    expect(r.status).toBe(401);
  });
});

// ─── AI receipt endpoint guards (no network / key needed) ─────────
describe("AI receipt — guards", () => {
  it("unauthenticated → 401", async () => {
    const r = await req(appAnon, "POST", "/api/ai/receipt-from-file");
    expect(r.status).toBe(401);
  });

  it("authenticated but no file → 400", async () => {
    // multipart with no file part
    const fd = new FormData();
    fd.append("instruction", "hi");
    const r = await appA.request("/api/ai/receipt-from-file", { method: "POST", body: fd });
    expect(r.status).toBe(400);
    const b = await jsonBody(r);
    expect(b.error.code).toBe("no_file");
  });
});
