'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney, formatDate } from '@/lib/utils';

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpensesPage() {
  const utils = trpc.useUtils();
  const expenses = trpc.expense.list.useQuery();
  const create = trpc.expense.create.useMutation({
    onSuccess: () => {
      utils.expense.list.invalidate();
      setForm({ vendor: '', category: '', amount: '', date: today() });
      setOpen(false);
    },
  });
  const del = trpc.expense.delete.useMutation({
    onSuccess: () => utils.expense.list.invalidate(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vendor: '', category: '', amount: '', date: today() });

  const amountNum = parseFloat(form.amount);
  const canSave = Number.isFinite(amountNum) && amountNum > 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Expenses</h1>
        <Button onClick={() => setOpen((o) => !o)}>{open ? 'Close' : '+ New expense'}</Button>
      </div>

      {open && (
        <Card className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              placeholder="Vendor"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            />
            <Input
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Input
              type="number"
              step="any"
              placeholder="Amount *"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          {create.error && (
            <p className="mt-3 text-sm text-[var(--color-danger)]">{create.error.message}</p>
          )}
          <div className="mt-4">
            <Button
              disabled={!canSave || create.isPending}
              onClick={() =>
                create.mutate({
                  vendor: form.vendor || undefined,
                  category: form.category || undefined,
                  amount: amountNum,
                  date: form.date,
                })
              }
            >
              {create.isPending ? 'Saving…' : 'Save expense'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="mt-6 p-0">
        {expenses.isLoading ? (
          <p className="p-6 text-sm text-[var(--color-ink-muted)]">Loading…</p>
        ) : expenses.data?.length === 0 ? (
          <p className="p-6 text-sm text-[var(--color-ink-muted)]">No expenses logged.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-ink-muted)]">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Vendor</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 text-right font-medium">Amount</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {expenses.data?.map((ex) => (
                <tr key={ex.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="p-4 text-[var(--color-ink-muted)]">{formatDate(ex.date)}</td>
                  <td className="p-4">{ex.vendor ?? '—'}</td>
                  <td className="p-4 text-[var(--color-ink-muted)]">{ex.category ?? '—'}</td>
                  <td className="p-4 text-right font-medium">
                    {formatMoney(Number(ex.amount ?? 0), ex.currency ?? 'USD')}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => del.mutate(ex.id)}
                      className="text-[var(--color-ink-muted)] hover:text-[var(--color-danger)]"
                      aria-label="Delete expense"
                    >
                      ✕
                    </button>
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
