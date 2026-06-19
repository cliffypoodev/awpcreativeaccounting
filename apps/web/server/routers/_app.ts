import { router } from '../trpc';
import { orgRouter } from './org';
import { clientRouter } from './client';
import { invoiceRouter } from './invoice';
import { estimateRouter } from './estimate';
import { expenseRouter } from './expense';
import { dashboardRouter } from './dashboard';

/** Root tRPC router (blueprint §14). */
export const appRouter = router({
  org: orgRouter,
  client: clientRouter,
  invoice: invoiceRouter,
  estimate: estimateRouter,
  expense: expenseRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
