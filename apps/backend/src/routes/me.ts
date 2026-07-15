import { Hono } from "hono";
import { prisma } from "../prisma";
import { calculateInvoice, lineAmount } from "../types";
import { requireOrg, type AppContext } from "../lib/context";
import { recalcClient } from "./invoices";

const meRouter = new Hono<AppContext>();

meRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.body(null, 401);
  const org = await requireOrg(c);
  return c.json({
    data: {
      user: { id: user.id, name: user.name, email: user.email },
      org: org ? { id: org.id, name: org.name, slug: org.slug, brandColor: org.brandColor } : null,
    },
  });
});

/** Populate a fresh org with realistic demo data (mirrors the original seed). */
meRouter.post("/seed-demo", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);

  const existing = await prisma.client.count({ where: { orgId: org.id } });
  if (existing > 0) return c.json({ data: { seeded: false, reason: "not_empty" } });

  const clients = await Promise.all(
    [
      { name: "Northwind Studios", email: "ap@northwind.test", company: "Northwind LLC" },
      { name: "Acme Robotics", email: "billing@acme.test", company: "Acme Inc" },
      { name: "Meridian Health", email: "finance@meridian.test", company: "Meridian Group" },
    ].map((d) => prisma.client.create({ data: { orgId: org.id, ...d } }))
  );

  const today = new Date();
  const iso = (offsetDays: number) =>
    new Date(today.getTime() + offsetDays * 864e5).toISOString().slice(0, 10);

  const samples = [
    {
      client: clients[0]!,
      status: "paid",
      issue: iso(-40),
      due: iso(-10),
      items: [
        { description: "Brand identity design", quantity: 12, unitPrice: 150, taxRate: 8.5 },
        { description: "Website build — fixed fee", quantity: 1, unitPrice: 2500, taxRate: 8.5 },
      ],
      discounts: [{ type: "percentage" as const, value: 10 }],
    },
    {
      client: clients[1]!,
      status: "sent",
      issue: iso(-12),
      due: iso(18),
      items: [
        { description: "Automation consulting (hours)", quantity: 20, unitPrice: 175, taxRate: 0 },
      ],
      discounts: [],
    },
    {
      client: clients[2]!,
      status: "overdue",
      issue: iso(-50),
      due: iso(-20),
      items: [
        { description: "Quarterly retainer", quantity: 1, unitPrice: 4000, taxRate: 0 },
        { description: "Extra design revisions", quantity: 6, unitPrice: 120, taxRate: 0 },
      ],
      discounts: [],
    },
  ];

  let seq = 0;
  for (const s of samples) {
    seq += 1;
    const totals = calculateInvoice(s.items, s.discounts, []);
    await prisma.invoice.create({
      data: {
        orgId: org.id,
        clientId: s.client.id,
        number: `INV-${String(seq).padStart(4, "0")}`,
        status: s.status,
        issueDate: s.issue,
        dueDate: s.due,
        currency: "USD",
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        total: totals.total,
        amountPaid: s.status === "paid" ? totals.total : 0,
        amountDue: s.status === "paid" ? 0 : totals.amountDue,
        paidAt: s.status === "paid" ? new Date(s.due) : null,
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
        discounts: {
          create: s.discounts.map((d) => ({
            type: d.type,
            value: d.value,
            amount: Math.round(totals.subtotal * (d.value / 100) * 100) / 100,
          })),
        },
      },
    });
  }

  // an open estimate
  const estItems = [{ description: "Mobile app — phase 1", quantity: 1, unitPrice: 9500, taxRate: 0 }];
  const estTotals = calculateInvoice(estItems, [], []);
  await prisma.estimate.create({
    data: {
      orgId: org.id,
      clientId: clients[1]!.id,
      number: "EST-0001",
      status: "sent",
      issueDate: iso(-3),
      expiryDate: iso(27),
      currency: "USD",
      subtotal: estTotals.subtotal,
      taxAmount: estTotals.taxAmount,
      discountAmount: estTotals.discountAmount,
      total: estTotals.total,
      items: {
        create: estItems.map((it, idx) => ({
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

  await prisma.expense.createMany({
    data: [
      { orgId: org.id, category: "Software", vendor: "Figma", amount: 45, date: iso(-15), taxDeductible: true },
      { orgId: org.id, category: "Software", vendor: "Adobe CC", amount: 59.99, date: iso(-15), taxDeductible: true },
      { orgId: org.id, category: "Travel", vendor: "Delta", amount: 320, date: iso(-25), taxDeductible: true },
      { orgId: org.id, category: "Office", vendor: "WeWork", amount: 450, date: iso(-5), taxDeductible: false },
    ],
  });

  await prisma.organization.update({ where: { id: org.id }, data: { invoiceSeq: seq, estimateSeq: 1 } });
  for (const cl of clients) await recalcClient(cl.id);

  return c.json({ data: { seeded: true } });
});

export { meRouter };
