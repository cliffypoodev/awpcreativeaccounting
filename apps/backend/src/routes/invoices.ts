import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../prisma";
import {
  invoiceInput,
  invoiceUpdate,
  calculateInvoice,
  lineAmount,
  INVOICE_STATUSES,
  type InvoiceRow,
} from "../types";
import { requireOrg, errorJson, body, type AppContext } from "../lib/context";

const invoicesRouter = new Hono<AppContext>();

const clientSel = { id: true, name: true, company: true, email: true };

export const invoiceInclude = {
  items: { orderBy: { sortOrder: "asc" as const } },
  discounts: true,
  deposits: true,
  client: { select: clientSel },
  project: { select: { id: true, name: true, referenceCode: true } },
};

export function toInvoiceRow(i: any): InvoiceRow {
  return {
    id: i.id,
    number: i.number,
    status: i.status,
    issueDate: i.issueDate,
    dueDate: i.dueDate,
    currency: i.currency,
    subtotal: i.subtotal,
    taxAmount: i.taxAmount,
    discountAmount: i.discountAmount,
    depositsTotal: i.depositsTotal,
    total: i.total,
    amountPaid: i.amountPaid,
    amountDue: i.amountDue,
    notes: i.notes,
    terms: i.terms,
    clientId: i.clientId,
    client: i.client ?? null,
    projectId: i.projectId ?? null,
    project: i.project ?? null,
    milestoneType: i.milestoneType ?? null,
    items: (i.items ?? []).map((it: any) => ({
      id: it.id,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.amount,
      taxRate: it.taxRate,
      unit: it.unit,
      sortOrder: it.sortOrder,
    })),
    discounts: (i.discounts ?? []).map((d: any) => ({
      id: d.id,
      description: d.description,
      type: d.type,
      value: d.value,
      amount: d.amount,
    })),
    deposits: (i.deposits ?? []).map((d: any) => ({
      id: d.id,
      description: d.description,
      amount: d.amount,
    })),
    fromEstimateId: i.fromEstimateId,
    recurringScheduleId: i.recurringScheduleId ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

async function nextInvoiceNumber(orgId: string): Promise<string> {
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { invoiceSeq: { increment: 1 } },
  });
  return `INV-${String(org.invoiceSeq).padStart(4, "0")}`;
}

invoicesRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const invoices = await prisma.invoice.findMany({
    where: { orgId: org.id },
    include: invoiceInclude,
    orderBy: { createdAt: "desc" },
  });
  return c.json({ data: invoices.map(toInvoiceRow) });
});

invoicesRouter.get("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const inv = await prisma.invoice.findFirst({
    where: { id: c.req.param("id"), orgId: org.id },
    include: invoiceInclude,
  });
  if (!inv) return errorJson(c, "Invoice not found", "not_found", 404);
  return c.json({ data: toInvoiceRow(inv) });
});

invoicesRouter.post("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const input = await body(c, invoiceInput);

  if (input.clientId) {
    const owns = await prisma.client.findFirst({ where: { id: input.clientId, orgId: org.id } });
    if (!owns) return errorJson(c, "Client not found", "bad_client");
  }

  const totals = calculateInvoice(
    input.items,
    input.discounts,
    input.deposits.map((d) => d.amount)
  );
  const number = input.number?.trim() || (await nextInvoiceNumber(org.id));

  const created = await prisma.invoice.create({
    data: {
      orgId: org.id,
      clientId: input.clientId || null,
      projectId: input.projectId || null,
      milestoneType: input.milestoneType || null,
      number,
      status: input.status,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      currency: input.currency,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      depositsTotal: totals.depositsTotal,
      total: totals.total,
      amountDue: totals.amountDue,
      notes: input.notes || null,
      terms: input.terms || null,
      items: {
        create: input.items.map((it, idx) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: lineAmount(it.quantity, it.unitPrice),
          taxRate: it.taxRate,
          unit: it.unit || null,
          sortOrder: idx,
        })),
      },
      discounts: {
        create: input.discounts.map((d) => ({
          description: d.description || null,
          type: d.type,
          value: d.value,
          amount:
            d.type === "percentage"
              ? Math.round(totals.subtotal * (d.value / 100) * 100) / 100
              : d.value,
        })),
      },
      deposits: {
        create: input.deposits.map((d) => ({
          description: d.description || null,
          amount: d.amount,
        })),
      },
    },
    include: invoiceInclude,
  });

  await recalcClient(input.clientId);
  return c.json({ data: toInvoiceRow(created) });
});

invoicesRouter.put("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.invoice.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Invoice not found", "not_found", 404);
  const input = await body(c, invoiceInput);

  const totals = calculateInvoice(
    input.items,
    input.discounts,
    input.deposits.map((d) => d.amount)
  );

  // Replace child rows wholesale (simplest correct approach for an editor).
  await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
    prisma.invoiceDiscount.deleteMany({ where: { invoiceId: id } }),
    prisma.invoiceDeposit.deleteMany({ where: { invoiceId: id } }),
  ]);

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      clientId: input.clientId || null,
      projectId: input.projectId || null,
      milestoneType: input.milestoneType || null,
      number: input.number?.trim() || existing.number,
      status: input.status,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      currency: input.currency,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      depositsTotal: totals.depositsTotal,
      total: totals.total,
      amountDue: totals.amountDue,
      notes: input.notes || null,
      terms: input.terms || null,
      items: {
        create: input.items.map((it, idx) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: lineAmount(it.quantity, it.unitPrice),
          taxRate: it.taxRate,
          unit: it.unit || null,
          sortOrder: idx,
        })),
      },
      discounts: {
        create: input.discounts.map((d) => ({
          description: d.description || null,
          type: d.type,
          value: d.value,
          amount:
            d.type === "percentage"
              ? Math.round(totals.subtotal * (d.value / 100) * 100) / 100
              : d.value,
        })),
      },
      deposits: {
        create: input.deposits.map((d) => ({
          description: d.description || null,
          amount: d.amount,
        })),
      },
    },
    include: invoiceInclude,
  });

  await recalcClient(input.clientId);
  if (existing.clientId && existing.clientId !== input.clientId) await recalcClient(existing.clientId);
  return c.json({ data: toInvoiceRow(updated) });
});

invoicesRouter.patch("/:id/status", async (c) => {
    const org = await requireOrg(c);
    if (!org) return c.body(null, 401);
    const id = c.req.param("id");
    const existing = await prisma.invoice.findFirst({ where: { id, orgId: org.id } });
    if (!existing) return errorJson(c, "Invoice not found", "not_found", 404);
    const { status } = await body(c, z.object({ status: z.enum(INVOICE_STATUSES) }));

    const data: any = { status };
    if (status === "paid") {
      data.amountPaid = existing.total;
      data.amountDue = 0;
      data.paidAt = new Date();
    } else if (status === "sent" && !existing.sentAt) {
      data.sentAt = new Date();
    }
    const updated = await prisma.invoice.update({
      where: { id },
      data,
      include: invoiceInclude,
    });
    await recalcClient(existing.clientId);
    return c.json({ data: toInvoiceRow(updated) });
});

invoicesRouter.delete("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.invoice.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Invoice not found", "not_found", 404);
  await prisma.invoice.delete({ where: { id } });
  await recalcClient(existing.clientId);
  return c.body(null, 204);
});

/** Recompute a client's denormalized money rollups from its invoices. */
export async function recalcClient(clientId: string | null | undefined) {
  if (!clientId) return;
  const invoices = await prisma.invoice.findMany({
    where: { clientId, status: { not: "cancelled" } },
  });
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + i.amountDue, 0);
  await prisma.client.update({
    where: { id: clientId },
    data: {
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    },
  });
}

export { invoicesRouter };
