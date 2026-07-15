import { Hono } from "hono";
import { prisma } from "../prisma";
import {
  recurringInput,
  calculateInvoice,
  lineAmount,
  type RecurringScheduleRow,
  type RecurringItemRow,
  type InvoiceTotals,
} from "../types";
import { requireOrg, errorJson, body, type AppContext } from "../lib/context";

const recurringRouter = new Hono<AppContext>();

const clientSel = { id: true, name: true, company: true };
const projectSel = { id: true, name: true, referenceCode: true };

const recurringInclude = {
  client: { select: clientSel },
  project: { select: projectSel },
  items: { orderBy: { sortOrder: "asc" as const } },
};

function toRow(s: any): RecurringScheduleRow {
  const items: RecurringItemRow[] = (s.items ?? []).map((it: any) => ({
    id: it.id,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    taxRate: it.taxRate,
    sortOrder: it.sortOrder,
  }));
  const totals: InvoiceTotals = calculateInvoice(items, [], []);
  return {
    id: s.id,
    orgId: s.orgId,
    clientId: s.clientId,
    client: s.client ?? null,
    projectId: s.projectId,
    project: s.project ?? null,
    name: s.name,
    status: s.status,
    frequency: s.frequency,
    nextDate: s.nextDate,
    endDate: s.endDate,
    currency: s.currency,
    totalPrepaid: s.totalPrepaid,
    unitsUsed: s.unitsUsed,
    notes: s.notes,
    items,
    totals,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

recurringRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const rows = await prisma.recurringSchedule.findMany({
    where: { orgId: org.id },
    include: recurringInclude,
    orderBy: { nextDate: "asc" },
  });
  return c.json({ data: rows.map(toRow) });
});

recurringRouter.get("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const s = await prisma.recurringSchedule.findFirst({
    where: { id: c.req.param("id"), orgId: org.id },
    include: recurringInclude,
  });
  if (!s) return errorJson(c, "Schedule not found", "not_found", 404);
  return c.json({ data: toRow(s) });
});

recurringRouter.post("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const input = await body(c, recurringInput);

  if (input.clientId) {
    const cl = await prisma.client.findFirst({ where: { id: input.clientId, orgId: org.id } });
    if (!cl) return errorJson(c, "Client not found", "not_found", 404);
  }
  if (input.projectId) {
    const pr = await prisma.project.findFirst({ where: { id: input.projectId, orgId: org.id } });
    if (!pr) return errorJson(c, "Project not found", "not_found", 404);
  }

  const s = await prisma.recurringSchedule.create({
    data: {
      orgId: org.id,
      clientId: input.clientId || null,
      projectId: input.projectId || null,
      name: input.name,
      status: input.status ?? "active",
      frequency: input.frequency ?? "monthly",
      nextDate: input.nextDate,
      endDate: input.endDate || null,
      currency: input.currency,
      totalPrepaid: input.totalPrepaid ?? 0,
      notes: input.notes || null,
      items: {
        create: input.items.map((it, idx) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate,
          sortOrder: idx,
        })),
      },
    },
    include: recurringInclude,
  });
  return c.json({ data: toRow(s) }, 201);
});

recurringRouter.put("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.recurringSchedule.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Schedule not found", "not_found", 404);
  const input = await body(c, recurringInput);

  await prisma.recurringItem.deleteMany({ where: { scheduleId: id } });
  const s = await prisma.recurringSchedule.update({
    where: { id },
    data: {
      clientId: input.clientId || null,
      projectId: input.projectId || null,
      name: input.name,
      status: input.status ?? existing.status,
      frequency: input.frequency ?? existing.frequency,
      nextDate: input.nextDate,
      endDate: input.endDate || null,
      currency: input.currency,
      totalPrepaid: input.totalPrepaid ?? existing.totalPrepaid,
      notes: input.notes || null,
      items: {
        create: input.items.map((it, idx) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate,
          sortOrder: idx,
        })),
      },
    },
    include: recurringInclude,
  });
  return c.json({ data: toRow(s) });
});

/** Generate the next invoice from this schedule and advance nextDate. */
recurringRouter.post("/:id/generate", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const s = await prisma.recurringSchedule.findFirst({
    where: { id, orgId: org.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!s) return errorJson(c, "Schedule not found", "not_found", 404);
  if (s.status !== "active") return errorJson(c, "Schedule is not active", "not_active");

  // Burndown check
  if (s.totalPrepaid > 0 && s.unitsUsed >= s.totalPrepaid) {
    return errorJson(c, "All prepaid units have been used", "burndown_exhausted");
  }

  const totals = calculateInvoice(s.items, [], []);

  // Auto-increment org invoiceSeq
  const orgRow = await prisma.organization.update({
    where: { id: org.id },
    data: { invoiceSeq: { increment: 1 } },
  });
  const number = `INV-${String(orgRow.invoiceSeq).padStart(4, "0")}`;

  // Advance nextDate based on frequency
  const next = new Date(s.nextDate);
  if (s.frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (s.frequency === "monthly") next.setMonth(next.getMonth() + 1);
  else if (s.frequency === "quarterly") next.setMonth(next.getMonth() + 3);
  const nextDateStr = next.toISOString().slice(0, 10);

  // Due date = nextDate + org default terms
  const orgFull = await prisma.organization.findFirst({ where: { id: org.id } });
  const dueDate = new Date(s.nextDate);
  dueDate.setDate(dueDate.getDate() + (orgFull?.defaultPaymentTerms ?? 30));
  const dueDateStr = dueDate.toISOString().slice(0, 10);

  const invoice = await prisma.invoice.create({
    data: {
      orgId: org.id,
      clientId: s.clientId,
      projectId: s.projectId,
      number,
      status: "draft",
      issueDate: s.nextDate,
      dueDate: dueDateStr,
      currency: s.currency,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      depositsTotal: 0,
      total: totals.total,
      amountDue: totals.total,
      recurringScheduleId: s.id,
      items: {
        create: s.items.map((it, idx) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: lineAmount(it.quantity, it.unitPrice),
          taxRate: it.taxRate,
          sortOrder: idx,
        })),
      },
    },
  });

  // Update unitsUsed + nextDate
  await prisma.recurringSchedule.update({
    where: { id },
    data: {
      unitsUsed: { increment: 1 },
      nextDate: nextDateStr,
      // Auto-cancel if burndown exhausted after this generation
      status: s.totalPrepaid > 0 && s.unitsUsed + 1 >= s.totalPrepaid ? "cancelled" : s.status,
    },
  });

  return c.json({ data: { invoiceId: invoice.id, invoiceNumber: invoice.number, nextDate: nextDateStr } });
});

recurringRouter.delete("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.recurringSchedule.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Schedule not found", "not_found", 404);
  await prisma.recurringSchedule.delete({ where: { id } });
  return c.body(null, 204);
});

export { recurringRouter };
