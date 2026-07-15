import { Hono } from "hono";
import { prisma } from "../prisma";
import { projectCostInput, type ProjectCostRow } from "../types";
import { requireOrg, errorJson, body, type AppContext } from "../lib/context";

const projectCostsRouter = new Hono<AppContext>();

function toRow(c: any): ProjectCostRow {
  return {
    id: c.id,
    projectId: c.projectId,
    category: c.category,
    description: c.description,
    amount: c.amount,
    currency: c.currency,
    date: c.date,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  };
}

// GET /api/projects/:projectId/costs — list all costs for a project
projectCostsRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const projectId = c.req.param("projectId") as string;

  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: org.id },
  });
  if (!project) return errorJson(c, "Project not found", "not_found", 404);

  const costs = await prisma.projectCost.findMany({
    where: { projectId, orgId: org.id },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ data: costs.map(toRow) });
});

// POST /api/projects/:projectId/costs — create a cost
projectCostsRouter.post("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const projectId = c.req.param("projectId") as string;

  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: org.id },
  });
  if (!project) return errorJson(c, "Project not found", "not_found", 404);

  const input = await body(c, projectCostInput);

  const cost = await prisma.projectCost.create({
    data: {
      orgId: org.id,
      projectId,
      category: input.category,
      description: input.description ?? null,
      amount: input.amount,
      currency: input.currency,
      date: input.date,
      notes: input.notes ?? null,
    },
  });
  return c.json({ data: toRow(cost) }, 201);
});

// PATCH /api/projects/:projectId/costs/:id — update a cost
projectCostsRouter.patch("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const projectId = c.req.param("projectId") as string;
  const costId = c.req.param("id") as string;

  const existing = await prisma.projectCost.findFirst({
    where: { id: costId, orgId: org.id, projectId },
  });
  if (!existing) return errorJson(c, "Cost not found", "not_found", 404);

  const input = await body(c, projectCostInput.partial());

  const cost = await prisma.projectCost.update({
    where: { id: costId },
    data: {
      ...(input.category !== undefined && { category: input.category }),
      ...(input.description !== undefined && { description: input.description ?? null }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.notes !== undefined && { notes: input.notes ?? null }),
    },
  });
  return c.json({ data: toRow(cost) });
});

// DELETE /api/projects/:projectId/costs/:id — delete a cost
projectCostsRouter.delete("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const costId = c.req.param("id") as string;

  const existing = await prisma.projectCost.findFirst({
    where: { id: costId, orgId: org.id },
  });
  if (!existing) return errorJson(c, "Cost not found", "not_found", 404);

  await prisma.projectCost.delete({ where: { id: costId } });
  return c.body(null, 204);
});

export { projectCostsRouter };
