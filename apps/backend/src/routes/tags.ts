import { Hono } from "hono";
import { prisma } from "../prisma";
import { tagInput, type TagRow } from "../types";
import { requireOrg, errorJson, body, type AppContext } from "../lib/context";

const tagsRouter = new Hono<AppContext>();

const toRow = (t: any): TagRow => ({ id: t.id, name: t.name, color: t.color });

tagsRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const tags = await prisma.tag.findMany({
    where: { orgId: org.id },
    orderBy: { name: "asc" },
  });
  return c.json({ data: tags.map(toRow) });
});

tagsRouter.post("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const input = await body(c, tagInput);
  // Check if tag with same name exists for this org (case-sensitive)
  const existing = await prisma.tag.findFirst({
    where: { orgId: org.id, name: input.name },
  });
  if (existing) return c.json({ data: toRow(existing) });
  const tag = await prisma.tag.create({
    data: { orgId: org.id, name: input.name, color: input.color ?? "#6b7280" },
  });
  return c.json({ data: toRow(tag) }, 201);
});

tagsRouter.put("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.tag.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Tag not found", "not_found", 404);
  const input = await body(c, tagInput);
  const tag = await prisma.tag.update({
    where: { id },
    data: { name: input.name, color: input.color ?? existing.color },
  });
  return c.json({ data: toRow(tag) });
});

tagsRouter.delete("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.tag.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Tag not found", "not_found", 404);
  await prisma.tag.delete({ where: { id } });
  return c.body(null, 204);
});

export { tagsRouter };
