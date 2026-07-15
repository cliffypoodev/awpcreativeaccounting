import { Hono } from "hono";
import { prisma } from "../prisma";
import { clientInput, type ClientRow, type TagRow } from "../types";
import { requireOrg, errorJson, body, type AppContext } from "../lib/context";

const clientsRouter = new Hono<AppContext>();

const clientInclude = {
  tagLinks: { include: { tag: true } },
};

function toRow(c: any): ClientRow {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    notes: c.notes,
    source: c.source ?? null,
    status: c.status ?? "active",
    tags: (c.tagLinks ?? []).map(
      (tl: any): TagRow => ({ id: tl.tag.id, name: tl.tag.name, color: tl.tag.color })
    ),
    totalInvoiced: c.totalInvoiced,
    totalPaid: c.totalPaid,
    totalOutstanding: c.totalOutstanding,
    createdAt: c.createdAt.toISOString(),
  };
}

clientsRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const clients = await prisma.client.findMany({
    where: { orgId: org.id },
    include: clientInclude,
    orderBy: { createdAt: "desc" },
  });
  return c.json({ data: clients.map(toRow) });
});

clientsRouter.get("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const client = await prisma.client.findFirst({
    where: { id: c.req.param("id"), orgId: org.id },
    include: clientInclude,
  });
  if (!client) return errorJson(c, "Client not found", "not_found", 404);
  return c.json({ data: toRow(client) });
});

clientsRouter.post("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const input = await body(c, clientInput);
  const tagIds = input.tagIds ?? [];
  if (tagIds.length > 0) {
    const valid = await prisma.tag.count({ where: { id: { in: tagIds }, orgId: org.id } });
    if (valid !== tagIds.length)
      return errorJson(c, "One or more tags not found", "not_found", 404);
  }
  const client = await prisma.client.create({
    data: {
      orgId: org.id,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      company: input.company || null,
      notes: input.notes || null,
      source: input.source || null,
      status: input.status ?? "active",
      tagLinks: tagIds.length > 0 ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
    include: clientInclude,
  });
  return c.json({ data: toRow(client) }, 201);
});

clientsRouter.put("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.client.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Client not found", "not_found", 404);
  const input = await body(c, clientInput);
  const tagIds = input.tagIds ?? [];
  if (tagIds.length > 0) {
    const valid = await prisma.tag.count({ where: { id: { in: tagIds }, orgId: org.id } });
    if (valid !== tagIds.length)
      return errorJson(c, "One or more tags not found", "not_found", 404);
  }
  // Replace tags
  await prisma.clientTag.deleteMany({ where: { clientId: id } });
  const client = await prisma.client.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      company: input.company || null,
      notes: input.notes || null,
      source: input.source || null,
      status: input.status ?? existing.status,
      tagLinks: tagIds.length > 0 ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
    include: clientInclude,
  });
  return c.json({ data: toRow(client) });
});

clientsRouter.delete("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.client.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Client not found", "not_found", 404);
  await prisma.client.delete({ where: { id } });
  return c.body(null, 204);
});

export { clientsRouter };
