/**
 * Phase 4 — Asset / deliverable catalog.
 *
 * Lets the owner catalog the deliverables produced for each project (final
 * videos, voiceover takes, podcast episodes, drone footage…), each linked to
 * its project and, where relevant, to the invoice it was delivered under.
 *
 * Every query is scoped to the signed-in owner's organization. A consistent
 * naming scheme is auto-applied when no name is given, and service-line /
 * asset-type tags are auto-applied so items stay searchable across projects.
 */
import { Hono } from "hono";
import { prisma } from "../prisma";
import {
  deliverableInput,
  suggestDeliverableName,
  ASSET_TYPE_LABELS,
  PROJECT_SERVICE_TYPES,
  type DeliverableRow,
  type TagRow,
} from "../types";
import { requireOrg, errorJson, body, type AppContext } from "../lib/context";

const deliverablesRouter = new Hono<AppContext>();

const SERVICE_LABELS: Record<string, string> = {
  commercial: "Commercial",
  voiceover: "Voiceover",
  podcast: "Podcast",
  drone: "Drone",
};

// Deterministic tag colors for auto-applied tags.
const ASSET_TAG_COLOR = "#0ea5e9";
const SERVICE_TAG_COLOR = "#8b5cf6";

function toRow(d: any): DeliverableRow {
  return {
    id: d.id,
    orgId: d.orgId,
    projectId: d.projectId,
    project: d.project
      ? {
          id: d.project.id,
          name: d.project.name,
          referenceCode: d.project.referenceCode,
          serviceType: d.project.serviceType,
        }
      : null,
    invoiceId: d.invoiceId ?? null,
    invoice: d.invoice ? { id: d.invoice.id, number: d.invoice.number } : null,
    name: d.name,
    assetType: d.assetType,
    status: d.status,
    fileUrl: d.fileUrl,
    fileFormat: d.fileFormat,
    fileSize: d.fileSize,
    version: d.version,
    deliveredAt: d.deliveredAt,
    notes: d.notes,
    tags: (d.tagLinks ?? []).map(
      (l: any): TagRow => ({ id: l.tag.id, name: l.tag.name, color: l.tag.color })
    ),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

const include = {
  project: { select: { id: true, name: true, referenceCode: true, serviceType: true } },
  invoice: { select: { id: true, number: true } },
  tagLinks: { include: { tag: true } },
};

/** Get an existing tag by name (case-insensitive within the org) or create it. */
async function getOrCreateTag(orgId: string, name: string, color: string): Promise<string> {
  const trimmed = name.trim().slice(0, 50);
  const existing = await prisma.tag.findFirst({
    where: { orgId, name: { equals: trimmed } },
  });
  if (existing) return existing.id;
  try {
    const created = await prisma.tag.create({ data: { orgId, name: trimmed, color } });
    return created.id;
  } catch {
    // Unique race — fetch whatever now exists.
    const again = await prisma.tag.findFirst({ where: { orgId, name: trimmed } });
    if (again) return again.id;
    throw new Error("Could not resolve tag");
  }
}

// GET /api/deliverables — list all deliverables for the org (optionally one project)
deliverablesRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);

  const projectId = c.req.query("projectId");
  const where: { orgId: string; projectId?: string } = { orgId: org.id };
  if (projectId) where.projectId = projectId;

  const rows = await prisma.deliverable.findMany({
    where,
    include,
    orderBy: { createdAt: "desc" },
  });
  return c.json({ data: rows.map(toRow) });
});

// POST /api/deliverables — create a deliverable
deliverablesRouter.post("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);

  const input = await body(c, deliverableInput);

  // Project must belong to this org.
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, orgId: org.id },
  });
  if (!project) return errorJson(c, "Project not found", "not_found", 404);

  // If an invoice is linked, it must belong to this org.
  if (input.invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: input.invoiceId, orgId: org.id },
    });
    if (!invoice) return errorJson(c, "Invoice not found", "not_found", 404);
  }

  // Resolve the version: explicit, else next sequence for this project + asset type.
  const version =
    input.version ??
    (await prisma.deliverable.count({
      where: { orgId: org.id, projectId: input.projectId, assetType: input.assetType },
    })) + 1;

  // Auto-name when none provided, using the consistent naming scheme.
  const name =
    input.name?.trim() || suggestDeliverableName(project.referenceCode, input.assetType, version);

  // Resolve tags: any explicit tagIds owned by this org + auto tags.
  const tagIds = new Set<string>();
  if (input.tagIds?.length) {
    const owned = await prisma.tag.findMany({
      where: { id: { in: input.tagIds }, orgId: org.id },
      select: { id: true },
    });
    owned.forEach((t) => tagIds.add(t.id));
  }
  // Auto-apply an asset-type tag and a service-line tag.
  tagIds.add(
    await getOrCreateTag(org.id, ASSET_TYPE_LABELS[input.assetType] ?? input.assetType, ASSET_TAG_COLOR)
  );
  if ((PROJECT_SERVICE_TYPES as readonly string[]).includes(project.serviceType)) {
    tagIds.add(
      await getOrCreateTag(
        org.id,
        SERVICE_LABELS[project.serviceType] ?? project.serviceType,
        SERVICE_TAG_COLOR
      )
    );
  }

  const created = await prisma.deliverable.create({
    data: {
      orgId: org.id,
      projectId: input.projectId,
      invoiceId: input.invoiceId ?? null,
      name,
      assetType: input.assetType,
      status: input.status ?? "draft",
      fileUrl: input.fileUrl ?? null,
      fileFormat: input.fileFormat ?? null,
      fileSize: input.fileSize ?? null,
      version,
      deliveredAt: input.deliveredAt ?? null,
      notes: input.notes ?? null,
      tagLinks: { create: [...tagIds].map((tagId) => ({ tagId })) },
    },
    include,
  });

  return c.json({ data: toRow(created) }, 201);
});

// PUT /api/deliverables/:id — update a deliverable
deliverablesRouter.put("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");

  const existing = await prisma.deliverable.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Deliverable not found", "not_found", 404);

  const input = await body(c, deliverableInput);

  // New project (if changed) must belong to org.
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, orgId: org.id },
  });
  if (!project) return errorJson(c, "Project not found", "not_found", 404);

  if (input.invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: input.invoiceId, orgId: org.id },
    });
    if (!invoice) return errorJson(c, "Invoice not found", "not_found", 404);
  }

  const version = input.version ?? existing.version;
  const name =
    input.name?.trim() || suggestDeliverableName(project.referenceCode, input.assetType, version);

  // Re-resolve tags (explicit owned + auto).
  const tagIds = new Set<string>();
  if (input.tagIds?.length) {
    const owned = await prisma.tag.findMany({
      where: { id: { in: input.tagIds }, orgId: org.id },
      select: { id: true },
    });
    owned.forEach((t) => tagIds.add(t.id));
  }
  tagIds.add(
    await getOrCreateTag(org.id, ASSET_TYPE_LABELS[input.assetType] ?? input.assetType, ASSET_TAG_COLOR)
  );
  if ((PROJECT_SERVICE_TYPES as readonly string[]).includes(project.serviceType)) {
    tagIds.add(
      await getOrCreateTag(
        org.id,
        SERVICE_LABELS[project.serviceType] ?? project.serviceType,
        SERVICE_TAG_COLOR
      )
    );
  }

  const updated = await prisma.deliverable.update({
    where: { id },
    data: {
      projectId: input.projectId,
      invoiceId: input.invoiceId ?? null,
      name,
      assetType: input.assetType,
      status: input.status ?? existing.status,
      fileUrl: input.fileUrl ?? null,
      fileFormat: input.fileFormat ?? null,
      fileSize: input.fileSize ?? null,
      version,
      deliveredAt: input.deliveredAt ?? null,
      notes: input.notes ?? null,
      tagLinks: { deleteMany: {}, create: [...tagIds].map((tagId) => ({ tagId })) },
    },
    include,
  });

  return c.json({ data: toRow(updated) });
});

// DELETE /api/deliverables/:id — delete a deliverable
deliverablesRouter.delete("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");

  const existing = await prisma.deliverable.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Deliverable not found", "not_found", 404);

  await prisma.deliverable.delete({ where: { id } });
  return c.body(null, 204);
});

export { deliverablesRouter };
