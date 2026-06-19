'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', organizationName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) router.push('/dashboard');
    else setError(JSON.stringify((await res.json()).error) ?? 'Signup failed');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8 font-display text-xl font-semibold">
        AWP Creative
      </Link>
      <Card>
        <h1 className="font-display text-2xl font-semibold">Start free</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">3 invoices/month, no card required.</p>
        <div className="mt-5 space-y-3">
          <Input placeholder="Your name" value={form.name} onChange={set('name')} />
          <Input placeholder="Business / organization name" value={form.organizationName} onChange={set('organizationName')} />
          <Input type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} />
          <Input type="password" placeholder="Password (8+ chars)" value={form.password} onChange={set('password')} />
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <Button className="w-full" onClick={submit} disabled={loading}>{loading ? 'Creating…' : 'Create account'}</Button>
        </div>
        <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
          Have an account? <Link href="/login" className="text-[var(--color-amber)]">Sign in</Link>
        </p>
      </Card>
    </main>
  );
}
