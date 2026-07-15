import { Hono } from "hono";
import { prisma } from "../prisma";
import {
  type ProjectProfitabilityRow,
  type ServiceLineSummaryRow,
  round,
} from "../types";
import { requireOrg, type AppContext } from "../lib/context";

const profitabilityRouter = new Hono<AppContext>();

// GET /api/profitability — per-project and per-service-line profitability
profitabilityRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);

  const projects = await prisma.project.findMany({
    where: { orgId: org.id },
    include: {
      client: { select: { name: true } },
      invoices: { where: { status: { notIn: ["draft", "cancelled"] } } },
      costs: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const projectRows: ProjectProfitabilityRow[] = projects.map((p) => {
    const totalBilled = round(p.invoices.reduce((sum, inv) => sum + inv.total, 0));
    const totalPaid = round(p.invoices.reduce((sum, inv) => sum + inv.amountPaid, 0));
    const totalCosts = round(p.costs.reduce((sum, cost) => sum + cost.amount, 0));
    const grossMargin = round(totalBilled - totalCosts);
    const grossMarginPct =
      totalBilled > 0
        ? round((Math.round((grossMargin / totalBilled) * 100) / 100) * 100)
        : 0;

    return {
      projectId: p.id,
      projectName: p.name,
      referenceCode: p.referenceCode,
      serviceType: p.serviceType,
      clientName: p.client?.name ?? null,
      status: p.status,
      totalBilled,
      totalPaid,
      totalCosts,
      grossMargin,
      grossMarginPct,
      currency: p.costs[0]?.currency ?? p.invoices[0]?.currency ?? "USD",
    };
  });

  // Group by serviceType for service line summary
  const serviceLineMap = new Map<string, {
    totalBilled: number;
    totalCosts: number;
    grossMargin: number;
    projectCount: number;
  }>();

  for (const row of projectRows) {
    const existing = serviceLineMap.get(row.serviceType);
    if (existing) {
      existing.totalBilled = round(existing.totalBilled + row.totalBilled);
      existing.totalCosts = round(existing.totalCosts + row.totalCosts);
      existing.grossMargin = round(existing.grossMargin + row.grossMargin);
      existing.projectCount += 1;
    } else {
      serviceLineMap.set(row.serviceType, {
        totalBilled: row.totalBilled,
        totalCosts: row.totalCosts,
        grossMargin: row.grossMargin,
        projectCount: 1,
      });
    }
  }

  const serviceLines: ServiceLineSummaryRow[] = Array.from(serviceLineMap.entries()).map(
    ([serviceType, agg]) => ({
      serviceType,
      totalBilled: agg.totalBilled,
      totalCosts: agg.totalCosts,
      grossMargin: agg.grossMargin,
      grossMarginPct:
        agg.totalBilled > 0
          ? round((Math.round((agg.grossMargin / agg.totalBilled) * 100) / 100) * 100)
          : 0,
      projectCount: agg.projectCount,
    })
  );

  return c.json({ data: { projects: projectRows, serviceLines } });
});

export { profitabilityRouter };
