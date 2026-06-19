import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { and, eq, desc } from 'drizzle-orm';
import { db, invoices, invoiceItems, invoiceDiscounts, invoiceDeposits, invoiceEvents } from '@invoiceforge/db';
import { invoiceInput, invoiceUpdate, calculateInvoice } from '@invoiceforge/shared';
import { router, protectedProcedure } from '../trpc';

const token = () => randomBytes(24).toString('hex');

export const invoiceRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where = input?.status
        ? and(eq(invoices.orgId, ctx.user.orgId), eq(invoices.status, input.status))
        : eq(invoices.orgId, ctx.user.orgId);
      return db.select().from(invoices).where(where).orderBy(desc(invoices.createdAt));
    }),

  byId: protectedProcedure.input(z.string().uuid()).query(async ({ ctx, input }) => {
    const [inv] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, input), eq(invoices.orgId, ctx.user.orgId)));
    if (!inv) throw new TRPCError({ code: 'NOT_FOUND' });
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id));
    return { ...inv, items };
  }),

  /** Server-side recompute of all totals — clients never set money fields directly. */
  create: protectedProcedure.input(invoiceInput).mutation(async ({ ctx, input }) => {
    const totals = calculateInvoice(
      input.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate })),
      input.discounts,
      input.deposits.map((d) => d.amount),
    );

    const [inv] = await db
      .insert(invoices)
      .values({
        orgId: ctx.user.orgId,
        clientId: input.clientId ?? null,
        number: input.number,
        status: input.status,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        currency: input.currency,
        subtotal: String(totals.subtotal),
        taxAmount: String(totals.taxAmount),
        discountAmount: String(totals.discountAmount),
        total: String(totals.total),
        amountDue: String(totals.amountDue),
        notes: input.notes,
        terms: input.terms,
        templateId: input.templateId ?? null,
        isRecurring: input.isRecurring,
        recurringSchedule: input.recurringSchedule ?? null,
        viewToken: token(),
        paymentLinkToken: token(),
      })
      .returning();

    if (!inv) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

    await db.insert(invoiceItems).values(
      input.items.map((it, i) => ({
        invoiceId: inv.id,
        description: it.description,
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
        amount: String(Math.round(it.quantity * it.unitPrice * 100) / 100),
        taxRate: String(it.taxRate),
        unit: it.unit,
        sortOrder: i,
      })),
    );

    if (input.discounts.length) {
      await db.insert(invoiceDiscounts).values(
        input.discounts.map((d) => ({
          invoiceId: inv.id,
          description: d.description,
          type: d.type,
          value: String(d.value),
          amount: String(
            d.type === 'percentage'
              ? Math.round(totals.subtotal * (d.value / 100) * 100) / 100
              : d.value,
          ),
        })),
      );
    }

    if (input.deposits.length) {
      await db.insert(invoiceDeposits).values(
        input.deposits.map((d) => ({ invoiceId: inv.id, description: d.description, amount: String(d.amount) })),
      );
    }

    await db.insert(invoiceEvents).values({ invoiceId: inv.id, eventType: 'created' });
    return inv;
  }),

  update: protectedProcedure.input(invoiceUpdate).mutation(async ({ ctx, input }) => {
    const { id } = input;
    const [existing] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.orgId, ctx.user.orgId)));
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of ['number', 'status', 'issueDate', 'dueDate', 'currency', 'notes', 'terms'] as const) {
      if (input[k] !== undefined) patch[k] = input[k];
    }
    const [row] = await db.update(invoices).set(patch).where(eq(invoices.id, id)).returning();
    return row;
  }),

  markSent: protectedProcedure.input(z.string().uuid()).mutation(async ({ ctx, input }) => {
    const [row] = await db
      .update(invoices)
      .set({ status: 'sent', sentAt: new Date() })
      .where(and(eq(invoices.id, input), eq(invoices.orgId, ctx.user.orgId)))
      .returning();
    if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
    await db.insert(invoiceEvents).values({ invoiceId: row.id, eventType: 'sent' });
    // TODO(worker): enqueue email job + Resend send (apps/worker email processor)
    return row;
  }),

  delete: protectedProcedure.input(z.string().uuid()).mutation(async ({ ctx, input }) => {
    await db.delete(invoices).where(and(eq(invoices.id, input), eq(invoices.orgId, ctx.user.orgId)));
    return { ok: true };
  }),
});
