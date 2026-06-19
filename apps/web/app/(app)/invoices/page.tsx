'use client';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatMoney, formatDate } from '@/lib/utils';

export default function InvoicesPage() {
  const invoices = trpc.invoice.list.useQuery();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Invoices</h1>
        <Link href="/invoices/new"><Button>+ New invoice</Button></Link>
      </div>

      <Card className="mt-6 overflow-hidden p-0">
        {invoices.isLoading ? (
          <p className="p-6 text-sm text-[var(--color-ink-muted)]">Loading…</p>
        ) : invoices.data?.length === 0 ? (
          <p className="p-6 text-sm text-[var(--color-ink-muted)]">No invoices yet. Create your first one.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-ink-muted)]">
                <th className="p-4 font-medium">Number</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Due</th>
                <th className="p-4 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.data?.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="p-4 font-mono">{inv.number}</td>
                  <td className="p-4"><StatusBadge status={inv.status ?? 'draft'} /></td>
                  <td className="p-4 text-[var(--color-ink-muted)]">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</td>
                  <td className="p-4 text-right font-medium">{formatMoney(inv.total ?? 0, inv.currency ?? 'USD')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
