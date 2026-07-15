import { Hono } from "hono";
import { prisma } from "../prisma";
import { projectInput, projectStatusUpdate, type ProjectRow, type TagRow } from "../types";
import { requireOrg, errorJson, body, type AppContext } from "../lib/context";

const projectsRouter = new Hono<AppContext>();

function buildReferenceCode(
  clientName: string | null | undefined,
  serviceType: string,
  date: string
): string {
  const client = (clientName || "Client").replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
  const svc = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
  return `${client}_${svc}_${date}`;
}

const clientSel = { id: true, name: true, company: true };

function toRow(p: any): ProjectRow {
  return {
    id: p.id,
    orgId: p.orgId,
    clientId: p.clientId,
    client: p.client ?? null,
    name: p.name,
    referenceCode: p.referenceCode,
    serviceType: p.serviceType,
    status: p.status,
    description: p.description,
    startDate: p.startDate,
    endDate: p.endDate,
    notes: p.notes,
    tags: (p.tagLinks ?? []).map(
      (tl: any): TagRow => ({ id: tl.tag.id, name: tl.tag.name, color: tl.tag.color })
    ),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

const projectInclude = {
  client: { select: clientSel },
  tagLinks: { include: { tag: true } },
};

projectsRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const rows = await prisma.project.findMany({
    where: { orgId: org.id },
    include: projectInclude,
    orderBy: { createdAt: "desc" },
  });
  return c.json({ data: rows.map(toRow) });
});

projectsRouter.get("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const p = await prisma.project.findFirst({
    where: { id: c.req.param("id"), orgId: org.id },
    include: projectInclude,
  });
  if (!p) return errorJson(c, "Project not found", "not_found", 404);
  return c.json({ data: toRow(p) });
});

projectsRouter.post("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const input = await body(c, projectInput);

  const tagIds = input.tagIds ?? [];
  if (tagIds.length > 0) {
    const valid = await prisma.tag.count({ where: { id: { in: tagIds }, orgId: org.id } });
    if (valid !== tagIds.length)
      return errorJson(c, "One or more tags not found", "not_found", 404);
  }

  let clientName: string | null = null;
  if (input.clientId) {
    const cl = await prisma.client.findFirst({ where: { id: input.clientId, orgId: org.id } });
    if (!cl) return errorJson(c, "Client not found", "not_found", 404);
    clientName = cl.name;
  }

  const today = new Date().toISOString().slice(0, 10);
  const referenceCode = buildReferenceCode(clientName, input.serviceType, today);

  const project = await prisma.project.create({
    data: {
      orgId: org.id,
      clientId: input.clientId || null,
      name: input.name,
      referenceCode,
      serviceType: input.serviceType,
      status: input.status ?? "lead",
      description: input.description || null,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      notes: input.notes || null,
      tagLinks:
        tagIds.length > 0 ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
    include: projectInclude,
  });
  return c.json({ data: toRow(project) }, 201);
});

projectsRouter.put("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.project.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Project not found", "not_found", 404);
  const input = await body(c, projectInput);

  const tagIds = input.tagIds ?? [];
  if (tagIds.length > 0) {
    const valid = await prisma.tag.count({ where: { id: { in: tagIds }, orgId: org.id } });
    if (valid !== tagIds.length)
      return errorJson(c, "One or more tags not found", "not_found", 404);
  }

  let clientName: string | null = null;
  if (input.clientId) {
    const cl = await prisma.client.findFirst({ where: { id: input.clientId, orgId: org.id } });
    if (!cl) return errorJson(c, "Client not found", "not_found", 404);
    clientName = cl.name;
  }

  // Recalculate reference code only if client or serviceType changed
  let referenceCode = existing.referenceCode;
  if (input.clientId !== existing.clientId || input.serviceType !== existing.serviceType) {
    const dateStr = existing.createdAt.toISOString().slice(0, 10);
    referenceCode = buildReferenceCode(clientName, input.serviceType, dateStr);
  }

  // Replace tags: delete old, create new
  await prisma.projectTag.deleteMany({ where: { projectId: id } });

  const project = await prisma.project.update({
    where: { id },
    data: {
      clientId: input.clientId || null,
      name: input.name,
      referenceCode,
      serviceType: input.serviceType,
      status: input.status ?? existing.status,
      description: input.description || null,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      notes: input.notes || null,
      tagLinks:
        tagIds.length > 0 ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
    include: projectInclude,
  });
  return c.json({ data: toRow(project) });
});

projectsRouter.patch("/:id/status", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.project.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Project not found", "not_found", 404);
  const { status } = await body(c, projectStatusUpdate);
  const project = await prisma.project.update({
    where: { id },
    data: { status },
    include: projectInclude,
  });
  return c.json({ data: toRow(project) });
});

projectsRouter.delete("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.project.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Project not found", "not_found", 404);
  await prisma.project.delete({ where: { id } });
  return c.body(null, 204);
});

export { projectsRouter };
