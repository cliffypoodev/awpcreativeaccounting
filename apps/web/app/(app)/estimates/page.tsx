'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatMoney, formatDate } from '@/lib/utils';

export default function EstimatesPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const estimates = trpc.estimate.list.useQuery();
  const convert = trpc.estimate.convert.useMutation({
    onSuccess: () => {
      utils.estimate.list.invalidate();
      router.push('/invoices');
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Estimates</h1>
      </div>

      <Card className="mt-6 p-0">
        {estimates.isLoading ? (
          <p className="p-6 text-sm text-[var(--color-ink-muted)]">Loading…</p>
        ) : estimates.data?.length === 0 ? (
          <p className="p-6 text-sm text-[var(--color-ink-muted)]">
            No estimates yet. Estimates can be approved by clients and converted to invoices in one
            click.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-ink-muted)]">
                <th className="p-4 font-medium">Number</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Expires</th>
                <th className="p-4 text-right font-medium">Total</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {estimates.data?.map((est) => (
                <tr key={est.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="p-4 font-mono">{est.number}</td>
                  <td className="p-4">
                    <StatusBadge status={est.status ?? 'draft'} />
                  </td>
                  <td className="p-4 text-[var(--color-ink-muted)]">
                    {est.expiryDate ? formatDate(est.expiryDate) : '—'}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatMoney(Number(est.total ?? 0), est.currency ?? 'USD')}
                  </td>
                  <td className="p-4 text-right">
                    {est.status !== 'converted' && (
                      <Button
                        variant="outline"
                        className="px-3 py-1"
                        disabled={convert.isPending}
                        onClick={() => convert.mutate(est.id)}
                      >
                        Convert → invoice
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
