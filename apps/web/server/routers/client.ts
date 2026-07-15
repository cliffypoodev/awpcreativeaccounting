import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { and, clients, db, desc, eq, ilike } from '@invoiceforge/db';
import { clientInput } from '@invoiceforge/shared';
import { router, protectedProcedure } from '../trpc';

export const clientRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where = input?.search
        ? and(eq(clients.orgId, ctx.user.orgId), ilike(clients.name, `%${input.search}%`))
        : eq(clients.orgId, ctx.user.orgId);
      return db.select().from(clients).where(where).orderBy(desc(clients.createdAt));
    }),

  byId: protectedProcedure.input(z.string().uuid()).query(async ({ ctx, input }) => {
    const [row] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, input), eq(clients.orgId, ctx.user.orgId)));
    if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
    return row;
  }),

  create: protectedProcedure.input(clientInput).mutation(async ({ ctx, input }) => {
    const [row] = await db
      .insert(clients)
      .values({ ...input, orgId: ctx.user.orgId })
      .returning();
    return row;
  }),

  update: protectedProcedure
    .input(clientInput.partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const [row] = await db
        .update(clients)
        .set(patch)
        .where(and(eq(clients.id, id), eq(clients.orgId, ctx.user.orgId)))
        .returning();
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      return row;
    }),

  delete: protectedProcedure.input(z.string().uuid()).mutation(async ({ ctx, input }) => {
    await db.delete(clients).where(and(eq(clients.id, input), eq(clients.orgId, ctx.user.orgId)));
    return { ok: true };
  }),
});
