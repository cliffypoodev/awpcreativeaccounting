/**
 * tRPC server setup (blueprint §14 internal API).
 * Context carries the resolved session user + orgId so every protected
 * procedure is automatically tenant-scoped.
 */
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { SessionUser } from '@invoiceforge/shared';
import { getSessionFromHeaders } from '@/lib/auth';

export interface Context {
  user: SessionUser | null;
  reqHeaders: Headers;
}

export async function createContext(opts: { headers: Headers }): Promise<Context> {
  const user = await getSessionFromHeaders(opts.headers);
  return { user, reqHeaders: opts.headers };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

/** Requires an authenticated user; narrows ctx.user to non-null. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in required' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Requires owner/admin role. */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'owner' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});
