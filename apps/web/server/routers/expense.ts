import { z } from 'zod';
import { and, db, desc, eq, expenses } from '@invoiceforge/db';
import { expenseInput } from '@invoiceforge/shared';
import { router, protectedProcedure } from '../trpc';

export const expenseRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    db.select().from(expenses).where(eq(expenses.orgId, ctx.user.orgId)).orderBy(desc(expenses.date)),
  ),
  create: protectedProcedure.input(expenseInput).mutation(async ({ ctx, input }) => {
    const [row] = await db
      .insert(expenses)
      .values({
        orgId: ctx.user.orgId,
        category: input.category,
        vendor: input.vendor,
        description: input.description,
        amount: String(input.amount),
        currency: input.currency,
        date: input.date,
        receiptUrl: input.receiptUrl ?? null,
        taxDeductible: input.taxDeductible,
        clientId: input.clientId ?? null,
      })
      .returning();
    return row;
  }),
  delete: protectedProcedure.input(z.string().uuid()).mutation(async ({ ctx, input }) => {
    await db
      .delete(expenses)
      .where(and(eq(expenses.id, input), eq(expenses.orgId, ctx.user.orgId)));
    return { ok: true };
  }),
});
