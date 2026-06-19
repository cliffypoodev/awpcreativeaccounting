'use client';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/utils';

export default function DashboardPage() {
  const kpis = trpc.dashboard.kpis.useQuery();
  const insights = trpc.dashboard.insights.useQuery();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        <Link href="/invoices/new"><Button>+ New invoice</Button></Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Revenue (paid)" value={kpis.data?.revenue} loading={kpis.isLoading} />
        <Kpi label="Outstanding" value={kpis.data?.outstanding} loading={kpis.isLoading} />
        <Kpi label="Overdue" value={kpis.data?.overdue} loading={kpis.isLoading} danger />
        <Kpi label="Paid this month" value={kpis.data?.paidThisMonth} loading={kpis.isLoading} />
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">AI insights</h2>
      <div className="mt-3 space-y-3">
        {insights.isLoading && <p className="text-sm text-[var(--color-ink-muted)]">Analyzing…</p>}
        {insights.data?.length === 0 && (
          <Card className="text-sm text-[var(--color-ink-muted)]">No alerts. Everything looks healthy. ✓</Card>
        )}
        {insights.data?.map((i, idx) => (
          <Card
            key={idx}
            className={i.severity === 'critical' ? 'border-[var(--color-danger)]' : ''}
          >
            <h3 className="font-semibold">{i.title}</h3>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{i.detail}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, loading, danger }: { label: string; value?: number; loading: boolean; danger?: boolean }) {
  return (
    <Card>
      <div className="text-xs text-[var(--color-ink-muted)]">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${danger ? 'text-[var(--color-danger)]' : ''}`}>
        {loading ? '—' : formatMoney(value ?? 0)}
      </div>
    </Card>
  );
}
