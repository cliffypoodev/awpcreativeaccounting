'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ClientsPage() {
  const utils = trpc.useUtils();
  const clients = trpc.client.list.useQuery();
  const create = trpc.client.create.useMutation({
    onSuccess: () => {
      utils.client.list.invalidate();
      setForm({ name: '', email: '', company: '', phone: '' });
      setOpen(false);
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '' });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Clients</h1>
        <Button onClick={() => setOpen((o) => !o)}>{open ? 'Close' : '+ New client'}</Button>
      </div>

      {open && (
        <Card className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
            <Input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          {create.error && (
            <p className="mt-3 text-sm text-[var(--color-danger)]">{create.error.message}</p>
          )}
          <div className="mt-4">
            <Button
              disabled={!form.name.trim() || create.isPending}
              onClick={() =>
                create.mutate({
                  name: form.name.trim(),
                  email: form.email || undefined,
                  company: form.company || undefined,
                  phone: form.phone || undefined,
                })
              }
            >
              {create.isPending ? 'Saving…' : 'Save client'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="mt-6 p-0">
        {clients.isLoading ? (
          <p className="p-6 text-sm text-[var(--color-ink-muted)]">Loading…</p>
        ) : clients.data?.length === 0 ? (
          <p className="p-6 text-sm text-[var(--color-ink-muted)]">No clients yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-ink-muted)]">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Company</th>
                <th className="p-4 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {clients.data?.map((c) => (
                <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="p-4 font-medium">{c.name}</td>
                  <td className="p-4 text-[var(--color-ink-muted)]">{c.company ?? '—'}</td>
                  <td className="p-4 text-[var(--color-ink-muted)]">{c.email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
