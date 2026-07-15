import { Hono } from "hono";
import { prisma } from "../prisma";
import { expenseInput, type ExpenseRow } from "../types";
import { requireOrg, errorJson, body, type AppContext } from "../lib/context";

const expensesRouter = new Hono<AppContext>();

const toRow = (e: any): ExpenseRow => ({
  id: e.id,
  category: e.category,
  vendor: e.vendor,
  description: e.description,
  amount: e.amount,
  currency: e.currency,
  date: e.date,
  taxDeductible: e.taxDeductible,
  clientId: e.clientId,
  client: e.client ?? null,
});

expensesRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const rows = await prisma.expense.findMany({
    where: { orgId: org.id },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });
  return c.json({ data: rows.map(toRow) });
});

expensesRouter.post("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const input = await body(c, expenseInput);
  const created = await prisma.expense.create({
    data: {
      orgId: org.id,
      category: input.category || null,
      vendor: input.vendor || null,
      description: input.description || null,
      amount: input.amount,
      currency: input.currency,
      date: input.date,
      taxDeductible: input.taxDeductible,
      clientId: input.clientId || null,
    },
    include: { client: { select: { id: true, name: true } } },
  });
  return c.json({ data: toRow(created) });
});

expensesRouter.put("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.expense.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Expense not found", "not_found", 404);
  const input = await body(c, expenseInput);
  const updated = await prisma.expense.update({
    where: { id },
    data: {
      category: input.category || null,
      vendor: input.vendor || null,
      description: input.description || null,
      amount: input.amount,
      currency: input.currency,
      date: input.date,
      taxDeductible: input.taxDeductible,
      clientId: input.clientId || null,
    },
    include: { client: { select: { id: true, name: true } } },
  });
  return c.json({ data: toRow(updated) });
});

expensesRouter.delete("/:id", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const id = c.req.param("id");
  const existing = await prisma.expense.findFirst({ where: { id, orgId: org.id } });
  if (!existing) return errorJson(c, "Expense not found", "not_found", 404);
  await prisma.expense.delete({ where: { id } });
  return c.body(null, 204);
});

export { expensesRouter };
