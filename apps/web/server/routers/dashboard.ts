import { and, db, eq, invoices, sql } from '@invoiceforge/db';
import type { DashboardKpis, AiInsight } from '@invoiceforge/shared';
import { router, protectedProcedure } from '../trpc';

export const dashboardRouter = router({
  kpis: protectedProcedure.query(async ({ ctx }): Promise<DashboardKpis> => {
    const rows = await db
      .select({ status: invoices.status, total: invoices.total, amountDue: invoices.amountDue, dueDate: invoices.dueDate, issueDate: invoices.issueDate })
      .from(invoices)
      .where(eq(invoices.orgId, ctx.user.orgId));

    const today = new Date().toISOString().slice(0, 10);
    let revenue = 0;
    let outstanding = 0;
    let overdue = 0;
    let paidThisMonth = 0;
    const month = today.slice(0, 7);
    const series = new Map<string, number>();

    for (const r of rows) {
      const total = parseFloat(r.total ?? '0');
      const due = parseFloat(r.amountDue ?? '0');
      if (r.status === 'paid') {
        revenue += total;
        if ((r.issueDate ?? '').slice(0, 7) === month) paidThisMonth += total;
      }
      if (r.status !== 'paid' && r.status !== 'cancelled') outstanding += due;
      if (r.status !== 'paid' && (r.dueDate ?? '') < today) overdue += due;
      const k = (r.issueDate ?? today).slice(0, 10);
      series.set(k, (series.get(k) ?? 0) + total);
    }

    const revenueSeries = [...series.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }));

    return {
      revenue: Math.round(revenue * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
      overdue: Math.round(overdue * 100) / 100,
      paidThisMonth: Math.round(paidThisMonth * 100) / 100,
      revenueSeries,
    };
  }),

  /**
   * AI insights. Heuristic placeholder for the FastAPI ai-service (blueprint §6).
   * Real implementation calls AI_SERVICE_URL/insights with the org's financials.
   */
  insights: protectedProcedure.query(async ({ ctx }): Promise<AiInsight[]> => {
    const [{ overdueCount } = { overdueCount: 0 }] = await db
      .select({ overdueCount: sql<number>`count(*)::int` })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, ctx.user.orgId),
          sql`${invoices.status} <> 'paid'`,
          sql`${invoices.dueDate} < now()`,
        ),
      );

    const insights: AiInsight[] = [];
    if (overdueCount > 0) {
      insights.push({
        type: 'overdue_alert',
        title: `${overdueCount} overdue invoice${overdueCount > 1 ? 's' : ''}`,
        detail: 'Send a reminder ladder to recover outstanding balances faster.',
        severity: overdueCount > 3 ? 'critical' : 'warning',
      });
    }
    return insights;
  }),
});
