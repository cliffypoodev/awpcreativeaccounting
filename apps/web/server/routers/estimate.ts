import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { and, db, desc, eq, estimates, estimateItems, invoices, invoiceItems } from '@invoiceforge/db';
import { estimateInput, calculateInvoice } from '@invoiceforge/shared';
import { router, protectedProcedure } from '../trpc';

const token = () => randomBytes(24).toString('hex');

export const estimateRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    db.select().from(estimates).where(eq(estimates.orgId, ctx.user.orgId)).orderBy(desc(estimates.createdAt)),
  ),

  create: protectedProcedure.input(estimateInput).mutation(async ({ ctx, input }) => {
    const totals = calculateInvoice(
      input.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate })),
      input.discounts,
      [],
    );
    const [est] = await db
      .insert(estimates)
      .values({
        orgId: ctx.user.orgId,
        clientId: input.clientId ?? null,
        number: input.number,
        status: input.status,
        issueDate: input.issueDate,
        expiryDate: input.expiryDate ?? null,
        currency: input.currency,
        subtotal: String(totals.subtotal),
        taxAmount: String(totals.taxAmount),
        discountAmount: String(totals.discountAmount),
        total: String(totals.total),
        notes: input.notes,
        terms: input.terms,
        approvalToken: token(),
        viewToken: token(),
      })
      .returning();
    if (!est) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    await db.insert(estimateItems).values(
      input.items.map((it, i) => ({
        estimateId: est.id,
        description: it.description,
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
        amount: String(Math.round(it.quantity * it.unitPrice * 100) / 100),
        taxRate: String(it.taxRate),
        sortOrder: i,
      })),
    );
    return est;
  }),

  /** One-click estimate -> invoice conversion (blueprint §5). */
  convert: protectedProcedure.input(z.string().uuid()).mutation(async ({ ctx, input }) => {
    const [est] = await db
      .select()
      .from(estimates)
      .where(and(eq(estimates.id, input), eq(estimates.orgId, ctx.user.orgId)));
    if (!est) throw new TRPCError({ code: 'NOT_FOUND' });
    const items = await db.select().from(estimateItems).where(eq(estimateItems.estimateId, est.id));

    const [inv] = await db
      .insert(invoices)
      .values({
        orgId: ctx.user.orgId,
        clientId: est.clientId,
        number: est.number.replace(/^EST/, 'INV'),
        status: 'draft',
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
        currency: est.currency,
        subtotal: est.subtotal,
        taxAmount: est.taxAmount,
        discountAmount: est.discountAmount,
        total: est.total,
        amountDue: est.total,
        fromEstimateId: est.id,
        viewToken: token(),
        paymentLinkToken: token(),
      })
      .returning();
    if (!inv) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    await db.insert(invoiceItems).values(
      items.map((it, i) => ({
        invoiceId: inv.id,
        description: it.description,
        quantity: it.quantity ?? '1',
        unitPrice: it.unitPrice,
        amount: it.amount,
        taxRate: it.taxRate ?? '0',
        sortOrder: i,
      })),
    );
    await db
      .update(estimates)
      .set({ status: 'converted', convertedInvoiceId: inv.id })
      .where(eq(estimates.id, est.id));
    return inv;
  }),
});
