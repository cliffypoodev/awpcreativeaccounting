import { Hono } from "hono";
import { prisma } from "../prisma";
import {
  estimateInput,
  estimateApprovalInput,
  calculateInvoice,
  lineAmount,
  type EstimateRow,
} from "../types";
import { requireOrg, errorJson, body, type AppContext } from "../lib/context";
import { invoiceInclude, toInvoiceRow, recalcClient } from "./invoices";

const estimatesRouter = new Hono<AppContext>();

const clientSel = { id: true, name: true, company: true, email: true };
const estimateInclude = {
  items: { orderBy: { sortOrder: "asc" as const } },
  discounts: true,
  client: { select: clientSel },
  project: { select: { id: true, name: true, referenceCode: true } },
  approval: true,
};

function toRow(e: any): EstimateRow {
  return {
    id: e.id,
    number: e.number,
    status: e.status,
    issueDate: e.issueDate,
    expiryDate: e.expiryDate,
    currency: e.currency,
    subtotal: e.subtotal,
    taxAmount: e.taxAmount,
    discountAmount: e.discountAmount,
    total: e.total,
    notes: e.notes,
    terms: e.terms,
    clientId: e.clientId,
    client: e.client ?? null,
    projectId: e.projectId ?? null,
    project: e.project ?? null,
    items: (e.items ?? []).map((it: any) => ({
      id: it.id,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.amount,
      taxRate: it.taxRate,
      unit: it.unit,
      sortOrder: it.sortOrder,
    })),
    discounts: (e.discounts ?? []).map((d: any) => ({
      id: d.id,
      description: d.description,
      type: d.type,
      value: d.value,
      amount: d.amount,
    })),
    convertedInvoiceId: e.convertedInvoiceId,
    approval: e.approval
      ? {
          id: e.approval.id,
          estimateId: e.approval.estimateId,
          signerName: e.approval.signerName,
          signerEmail: e.approval.signerEmail,
          createdAt: e.approval.createdAt.toISOString(),
        }
      : null,
    createdAt: e.createdAt.toISOString(),
  };
}

async function nextEstimateNumber(orgId: string): Promise<string> {
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { estimateSeq: { increment: 1 } },
  });
  return `EST-${String(org.estimateSeq).padStart(4, "0")}`;
}

estimatesRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const rows = await prisma.estimate.findMany({
    where: { orgId: org.id },
    include: estimateInclude,
    orderBy: { createdAt: "desc" },
  });
  return c.json({ data: rows.map(toRow) });
});

estimatesRouter.get("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const e = await prisma.estimate.findFirst({
    where: { id: c.req.param("id"), orgId: org.id },
    include: estimateInclude,
  });
  if (!e) return errorJson(c, "Estimate not found", "not_found", 404);
  return c.json({ data: toRow(e) });
});

estimatesRouter.post("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const input = await body(c, estimateInput);
  const totals = calculateInvoice(input.items, input.discounts, []);
  const number = input.number?.trim() || (await nextEstimateNumber(org.id));

  const created = await prisma.estimate.create({
    data: {
      orgId: org.id,
      clientId: input.clientId || null,
      projectId: input.projectId || null,
      number,
      status: input.status,
      issueDate: input.issueDate,
      expiryDate: input.expiryDate || null,
      currency: input.currency,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
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
    },
    include: estimateInclude,
  });
  return c.json({ data: toRow(created) });
});

estimatesRouter.put("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.estimate.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Estimate not found", "not_found", 404);
  const input = await body(c, estimateInput);
  const totals = calculateInvoice(input.items, input.discounts, []);

  await prisma.$transaction([
    prisma.estimateItem.deleteMany({ where: { estimateId: id } }),
    prisma.estimateDiscount.deleteMany({ where: { estimateId: id } }),
  ]);

  const updated = await prisma.estimate.update({
    where: { id },
    data: {
      clientId: input.clientId || null,
      projectId: input.projectId || null,
      number: input.number?.trim() || existing.number,
      status: input.status,
      issueDate: input.issueDate,
      expiryDate: input.expiryDate || null,
      currency: input.currency,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
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
    },
    include: estimateInclude,
  });
  return c.json({ data: toRow(updated) });
});

/** Convert an approved estimate into a draft invoice. */
estimatesRouter.post("/:id/convert", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const est = await prisma.estimate.findFirst({
    where: { id, orgId: org.id },
    include: { items: { orderBy: { sortOrder: "asc" } }, discounts: true },
  });
  if (!est) return errorJson(c, "Estimate not found", "not_found", 404);
  if (est.convertedInvoiceId)
    return errorJson(c, "Estimate already converted", "already_converted");

  const orgRow = await prisma.organization.update({
    where: { id: org.id },
    data: { invoiceSeq: { increment: 1 } },
  });
  const number = `INV-${String(orgRow.invoiceSeq).padStart(4, "0")}`;

  const issueDate = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + orgRow.defaultPaymentTerms * 864e5)
    .toISOString()
    .slice(0, 10);

  const invoice = await prisma.invoice.create({
    data: {
      orgId: org.id,
      clientId: est.clientId,
      projectId: est.projectId,
      number,
      status: "draft",
      issueDate,
      dueDate,
      currency: est.currency,
      subtotal: est.subtotal,
      taxAmount: est.taxAmount,
      discountAmount: est.discountAmount,
      depositsTotal: 0,
      total: est.total,
      amountDue: est.total,
      notes: est.notes,
      terms: est.terms,
      fromEstimateId: est.id,
      items: {
        create: est.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: it.amount,
          taxRate: it.taxRate,
          unit: it.unit,
          sortOrder: it.sortOrder,
        })),
      },
      discounts: {
        create: est.discounts.map((d) => ({
          description: d.description,
          type: d.type,
          value: d.value,
          amount: d.amount,
        })),
      },
    },
    include: invoiceInclude,
  });

  await prisma.estimate.update({
    where: { id },
    data: { status: "converted", convertedInvoiceId: invoice.id, approvedAt: new Date() },
  });
  await recalcClient(est.clientId);

  return c.json({ data: toInvoiceRow(invoice) });
});

/** Record client sign-off on an estimate. */
estimatesRouter.post("/:id/approve", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const est = await prisma.estimate.findFirst({
    where: { id, orgId: org.id },
    include: { approval: true },
  });
  if (!est) return errorJson(c, "Estimate not found", "not_found", 404);
  if (est.approval) return errorJson(c, "Estimate already has an approval record", "already_approved");

  const input = await body(c, estimateApprovalInput);
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    null;
  const userAgent = c.req.header("user-agent") ?? null;

  await prisma.$transaction([
    prisma.estimateApproval.create({
      data: {
        estimateId: id,
        signerName: input.signerName,
        signerEmail: input.signerEmail,
        ipAddress: ip,
        userAgent,
      },
    }),
    prisma.estimate.update({
      where: { id },
      data: { status: "approved", approvedAt: new Date() },
    }),
  ]);

  const updated = await prisma.estimate.findFirst({
    where: { id, orgId: org.id },
    include: estimateInclude,
  });
  return c.json({ data: toRow(updated) });
});

estimatesRouter.delete("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.estimate.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Estimate not found", "not_found", 404);
  await prisma.estimate.delete({ where: { id } });
  return c.body(null, 204);
});

export { estimatesRouter };
