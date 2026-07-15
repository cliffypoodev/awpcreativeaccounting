/**
 * Phase 4 — org-wide project-cost feed for the receipt inbox.
 *
 * The per-project CRUD lives in routes/project-costs.ts. This endpoint returns
 * every cost across the org (newest first) with its project context, so the
 * receipt inbox can show what's recently been filed. Org-scoped.
 */
import { Hono } from "hono";
import { prisma } from "../prisma";
import { type CostWithProjectRow } from "../types";
import { requireOrg, type AppContext } from "../lib/context";

const costsRouter = new Hono<AppContext>();

// GET /api/costs — all project costs for the org, with project info
costsRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);

  const limit = Math.min(Number(c.req.query("limit")) || 100, 500);

  const costs = await prisma.projectCost.findMany({
    where: { orgId: org.id },
    include: {
      project: { select: { name: true, referenceCode: true, serviceType: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const rows: CostWithProjectRow[] = costs.map((cost) => ({
    id: cost.id,
    projectId: cost.projectId,
    category: cost.category,
    description: cost.description,
    amount: cost.amount,
    currency: cost.currency,
    date: cost.date,
    notes: cost.notes,
    createdAt: cost.createdAt.toISOString(),
    projectName: cost.project?.name ?? "—",
    referenceCode: cost.project?.referenceCode ?? "",
    serviceType: cost.project?.serviceType ?? "",
  }));

  return c.json({ data: rows });
});

export { costsRouter };
