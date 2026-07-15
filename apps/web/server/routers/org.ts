import { TRPCError } from '@trpc/server';
import { db, eq, organizations } from '@invoiceforge/db';
import { organizationInput } from '@invoiceforge/shared';
import { router, protectedProcedure, adminProcedure } from '../trpc';

export const orgRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, ctx.user.orgId));
    if (!org) throw new TRPCError({ code: 'NOT_FOUND' });
    return org;
  }),
  update: adminProcedure.input(organizationInput.partial()).mutation(async ({ ctx, input }) => {
    const values = {
      ...input,
      defaultTaxRate: input.defaultTaxRate?.toString(),
      updatedAt: new Date(),
    };
    const [row] = await db
      .update(organizations)
      .set(values)
      .where(eq(organizations.id, ctx.user.orgId))
      .returning();
    return row;
  }),
});
