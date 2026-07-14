'use client';

/**
 * InvoiceForge — Live Invoice Editor (centerpiece)
 *
 * Real-time totals are computed CLIENT-SIDE with the exact same
 * `calculateInvoice` engine the server uses on submit, so the preview the
 * user sees is byte-for-byte what gets persisted. No money field is ever
 * trusted from the client — the server recomputes on create.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/utils';
import { calculateInvoice } from '@invoiceforge/shared';

interface DraftItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface DraftDiscount {
  type: 'percentage' | 'fixed';
  value: number;
}

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export default function NewInvoicePage() {
  const router = useRouter();
  const clients = trpc.clients.list.useQuery();
  const create = trpc.invoice.create.useMutation({
    onSuccess: (inv) => router.push('/invoices'),
  });

  const [number, setNumber] = useState('INV-0002');
  const [clientId, setClientId] = useState<string>('');
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(inDays(30));
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  const [items, setItems] = useState<DraftItem[]>([
    { description: '', quantity: 1, unitPrice: 0, taxRate: 0 },
  ]);
  const [discounts, setDiscounts] = useState<DraftDiscount[]>([]);
  const [deposits, setDeposits] = useState<number[]>([]);

  // Live totals — identical math to the server.
  const totals = useMemo(
    () =>
      calculateInvoice(
        items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate })),
        discounts,
        deposits,
      ),
    [items, discounts, deposits],
  );

  const setItem = (idx: number, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () =>
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);
  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const num = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const canSave =
    number.trim().length > 0 &&
    items.length > 0 &&
    items.every((i) => i.description.trim().length > 0);

  const onSave = () => {
    if (!canSave) return;
    create.mutate({
      number: number.trim(),
      clientId: clientId || undefined,
      status: 'draft',
      issueDate,
      dueDate,
      currency,
      items: items.map((i) => ({
        description: i.description.trim(),
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxRate: i.taxRate,
      })),
      discounts: discounts.map((d) => ({ type: d.type, value: d.value })),
      deposits: deposits.map((amount) => ({ amount })),
      notes: notes || undefined,
      terms: terms || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">New invoice</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push('/invoices')}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!canSave || create.isPending}>
            {create.isPending ? 'Saving…' : 'Save draft'}
          </Button>
        </div>
      </div>

      {create.error && (
        <p className="mt-4 rounded-md border border-[var(--color-danger)] p-3 text-sm text-[var(--color-danger)]">
          {create.error.message}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Left: form ──────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Invoice number">
                <Input value={number} onChange={(e) => setNumber(e.target.value)} />
              </Field>
              <Field label="Client">
                <select
                  className="h-10 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">— No client —</option>
                  {clients.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Issue date">
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </Field>
              <Field label="Due date">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="p-0">
            <div className="border-b border-[var(--color-border)] p-4">
              <h2 className="font-display text-lg font-semibold">Line items</h2>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 items-end gap-2 p-4">
                  <div className="col-span-12 sm:col-span-5">
                    <Label>Description</Label>
                    <Input
                      value={it.description}
                      placeholder="Consulting, design, hours…"
                      onChange={(e) => setItem(idx, { description: e.target.value })}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      step="any"
                      value={it.quantity}
                      onChange={(e) => setItem(idx, { quantity: num(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Label>Unit price</Label>
                    <Input
                      type="number"
                      step="any"
                      value={it.unitPrice}
                      onChange={(e) => setItem(idx, { unitPrice: num(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label>Tax %</Label>
                    <Input
                      type="number"
                      step="any"
                      value={it.taxRate}
                      onChange={(e) => setItem(idx, { taxRate: num(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-[var(--color-ink-muted)] hover:text-[var(--color-danger)]"
                      aria-label="Remove line"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--color-border)] p-4">
              <Button variant="ghost" onClick={addItem}>
                + Add line
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold">Discounts &amp; deposits</h2>
            <div className="mt-4 space-y-3">
              {discounts.map((d, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    className="h-10 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
                    value={d.type}
                    onChange={(e) =>
                      setDiscounts((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, type: e.target.value as DraftDiscount['type'] } : x,
                        ),
                      )
                    }
                  >
                    <option value="percentage">% off</option>
                    <option value="fixed">Fixed</option>
                  </select>
                  <Input
                    type="number"
                    step="any"
                    value={d.value}
                    onChange={(e) =>
                      setDiscounts((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, value: num(e.target.value) } : x)),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setDiscounts((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-[var(--color-ink-muted)] hover:text-[var(--color-danger)]"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {deposits.map((amt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-[120px] text-sm text-[var(--color-ink-muted)]">Deposit paid</span>
                  <Input
                    type="number"
                    step="any"
                    value={amt}
                    onChange={(e) =>
                      setDeposits((prev) => prev.map((x, i) => (i === idx ? num(e.target.value) : x)))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setDeposits((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-[var(--color-ink-muted)] hover:text-[var(--color-danger)]"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setDiscounts((p) => [...p, { type: 'percentage', value: 0 }])}
                >
                  + Discount
                </Button>
                <Button variant="ghost" onClick={() => setDeposits((p) => [...p, 0])}>
                  + Deposit
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Notes (shown on invoice)">
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-[var(--color-border)] bg-transparent p-3 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
              <Field label="Terms">
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-[var(--color-border)] bg-transparent p-3 text-sm"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* ── Right: live totals ──────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <h2 className="font-display text-lg font-semibold">Totals</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
              <Row label="Tax" value={formatMoney(totals.taxAmount, currency)} />
              {totals.discountAmount > 0 && (
                <Row label="Discounts" value={`− ${formatMoney(totals.discountAmount, currency)}`} />
              )}
              <div className="my-2 border-t border-[var(--color-border)]" />
              <Row label="Total" value={formatMoney(totals.total, currency)} strong />
              {totals.depositsTotal > 0 && (
                <Row label="Deposits" value={`− ${formatMoney(totals.depositsTotal, currency)}`} />
              )}
              <Row label="Amount due" value={formatMoney(totals.amountDue, currency)} strong accent />
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">{label}</span>
      {children}
    </label>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-xs text-[var(--color-ink-muted)]">{children}</span>;
}

function Row({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? 'font-medium' : 'text-[var(--color-ink-muted)]'}>{label}</dt>
      <dd
        className={`font-mono ${strong ? 'font-semibold' : ''} ${
          accent ? 'text-[var(--color-amber)] text-lg' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
