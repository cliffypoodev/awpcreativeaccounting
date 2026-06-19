import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { db, organizations } from '@invoiceforge/db';
import { organizationInput } from '@invoiceforge/shared';
import { router, protectedProcedure, adminProcedure } from '../trpc';

export const orgRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, ctx.user.orgId));
    if (!org) throw new TRPCError({ code: 'NOT_FOUND' });
    return org;
  }),
  update: adminProcedure.input(organizationInput.partial()).mutation(async ({ ctx, input }) => {
    const [row] = await db
      .update(organizations)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(organizations.id, ctx.user.orgId))
      .returning();
    return row;
  }),
});
