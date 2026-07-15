import { Hono } from "hono";
import { prisma } from "../prisma";
import { type DashboardStats, type CashFlowForecast, type CashFlowItem } from "../types";
import { requireOrg, type AppContext } from "../lib/context";
import { invoiceInclude, toInvoiceRow } from "./invoices";

const dashboardRouter = new Hono<AppContext>();

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

dashboardRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);

  const [invoices, expenses, clientCount] = await Promise.all([
    prisma.invoice.findMany({ where: { orgId: org.id }, include: invoiceInclude, orderBy: { createdAt: "desc" } }),
    prisma.expense.findMany({ where: { orgId: org.id } }),
    prisma.client.count({ where: { orgId: org.id } }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  // Fetch org for taxSetAsidePercent
  const orgFull = await prisma.organization.findFirst({ where: { id: org.id } });
  const taxSetAsidePercent = orgFull?.taxSetAsidePercent ?? 25;

  // Tax set-aside = sum of paid invoice totals × taxSetAsidePercent%
  const taxSetAside =
    Math.round(
      invoices
        .filter((i) => i.status === "paid")
        .reduce((s, i) => s + i.total, 0) *
        (taxSetAsidePercent / 100) *
        100
    ) / 100;

  const revenue = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const outstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "cancelled" && i.status !== "draft")
    .reduce((s, i) => s + i.amountDue, 0);
  const overdue = invoices
    .filter((i) => i.status !== "paid" && i.status !== "cancelled" && i.dueDate < today && i.status !== "draft")
    .reduce((s, i) => s + i.amountDue, 0);

  const draftCount = invoices.filter((i) => i.status === "draft").length;
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);

  // 6-month revenue vs expenses series
  const months: { month: string; revenue: number; expenses: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: monthKey(d), revenue: 0, expenses: 0 });
  }
  const idx = new Map(months.map((m, i) => [m.month, i]));
  for (const inv of invoices) {
    if (inv.amountPaid <= 0) continue;
    const k = (inv.paidAt ? inv.paidAt.toISOString() : inv.issueDate).slice(0, 7);
    const i = idx.get(k);
    if (i !== undefined && months[i]) months[i]!.revenue += inv.amountPaid;
  }
  for (const e of expenses) {
    const k = e.date.slice(0, 7);
    const i = idx.get(k);
    if (i !== undefined && months[i]) months[i]!.expenses += e.amount;
  }
  months.forEach((m) => {
    m.revenue = Math.round(m.revenue * 100) / 100;
    m.expenses = Math.round(m.expenses * 100) / 100;
  });

  const statusMap = new Map<string, { count: number; amount: number }>();
  for (const inv of invoices) {
    const cur = statusMap.get(inv.status) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += inv.total;
    statusMap.set(inv.status, cur);
  }
  const statusBreakdown = [...statusMap.entries()].map(([status, v]) => ({
    status,
    count: v.count,
    amount: Math.round(v.amount * 100) / 100,
  }));

  // Cash flow forecast: overdue + invoices due in next 90 days + recurring projections
  const cashFlowItems: CashFlowItem[] = [];

  // a) Overdue invoices
  const overdueInvoices = invoices.filter(
    (i) => !["paid", "cancelled", "draft"].includes(i.status) && i.dueDate < today
  );
  for (const inv of overdueInvoices) {
    cashFlowItems.push({
      date: inv.dueDate,
      label: `${inv.number}${inv.client ? " · " + inv.client.name : ""} (overdue)`,
      amount: inv.amountDue,
      currency: inv.currency,
      type: "overdue",
      referenceId: inv.id,
      referenceNumber: inv.number,
    });
  }

  // b) Active invoices due in next 90 days (not yet overdue)
  const d90 = new Date();
  d90.setDate(d90.getDate() + 90);
  const cutoff90 = d90.toISOString().slice(0, 10);

  const upcomingInvoices = invoices.filter(
    (i) =>
      !["paid", "cancelled", "draft"].includes(i.status) &&
      i.dueDate >= today &&
      i.dueDate <= cutoff90
  );
  for (const inv of upcomingInvoices) {
    cashFlowItems.push({
      date: inv.dueDate,
      label: `${inv.number}${inv.client ? " · " + inv.client.name : ""}`,
      amount: inv.amountDue,
      currency: inv.currency,
      type: "invoice_due",
      referenceId: inv.id,
      referenceNumber: inv.number,
    });
  }

  // c) Recurring schedule projections within 90 days
  const schedules = await prisma.recurringSchedule.findMany({
    where: { orgId: org.id, status: "active" },
    include: { items: true },
  });

  for (const sched of schedules) {
    // Project occurrences within 90 days (cap at 12 per schedule)
    let nextDate = sched.nextDate;
    let cap = 0;
    while (nextDate <= cutoff90 && cap < 12) {
      cap++;
      // Compute per-cycle total
      const total = sched.items.reduce(
        (sum, it) =>
          sum + Math.round(it.quantity * it.unitPrice * (1 + it.taxRate / 100) * 100) / 100,
        0
      );
      cashFlowItems.push({
        date: nextDate,
        label: sched.name + " (recurring)",
        amount: Math.round(total * 100) / 100,
        currency: sched.currency,
        type: "recurring_expected",
        referenceId: sched.id,
        referenceNumber: sched.name,
      });
      // Advance nextDate
      const d = new Date(nextDate + "T00:00:00");
      if (sched.frequency === "weekly") d.setDate(d.getDate() + 7);
      else if (sched.frequency === "monthly") d.setMonth(d.getMonth() + 1);
      else if (sched.frequency === "quarterly") d.setMonth(d.getMonth() + 3);
      nextDate = d.toISOString().slice(0, 10);
    }
  }

  // Sort by date
  cashFlowItems.sort((a, b) => a.date.localeCompare(b.date));

  // Compute totals
  const overdueTotal = overdueInvoices.reduce((s, i) => s + i.amountDue, 0);
  const d30 = new Date();
  d30.setDate(d30.getDate() + 30);
  const cutoff30 = d30.toISOString().slice(0, 10);
  const d60 = new Date();
  d60.setDate(d60.getDate() + 60);
  const cutoff60 = d60.toISOString().slice(0, 10);

  const next30Days = cashFlowItems
    .filter((i) => i.date >= today && i.date <= cutoff30)
    .reduce((s, i) => s + i.amount, 0);
  const next60Days = cashFlowItems
    .filter((i) => i.date >= today && i.date <= cutoff60)
    .reduce((s, i) => s + i.amount, 0);
  const next90Days = cashFlowItems
    .filter((i) => i.date >= today && i.date <= cutoff90)
    .reduce((s, i) => s + i.amount, 0);

  const cashFlow: CashFlowForecast = {
    overdueTotal: Math.round(overdueTotal * 100) / 100,
    next30Days: Math.round(next30Days * 100) / 100,
    next60Days: Math.round(next60Days * 100) / 100,
    next90Days: Math.round(next90Days * 100) / 100,
    items: cashFlowItems,
  };

  const stats: DashboardStats = {
    revenue: Math.round(revenue * 100) / 100,
    outstanding: Math.round(outstanding * 100) / 100,
    overdue: Math.round(overdue * 100) / 100,
    draftCount,
    paidCount,
    clientCount,
    expensesTotal: Math.round(expensesTotal * 100) / 100,
    netProfit: Math.round((revenue - expensesTotal) * 100) / 100,
    taxSetAside,
    taxSetAsidePercent,
    monthly: months.map((m) => ({
      month: new Date(m.month + "-01").toLocaleString("en", { month: "short" }),
      revenue: m.revenue,
      expenses: m.expenses,
    })),
    recentInvoices: invoices.slice(0, 5).map(toInvoiceRow),
    statusBreakdown,
    cashFlow,
  };

  return c.json({ data: stats });
});

export { dashboardRouter };
