'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) router.push('/dashboard');
    else setError((await res.json()).error ?? 'Login failed');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8 font-display text-xl font-semibold">
        Invoice<span className="text-[var(--color-amber)]">Forge</span>
      </Link>
      <Card>
        <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
        <div className="mt-5 space-y-3">
          <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <Button className="w-full" onClick={submit} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
        </div>
        <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
          No account? <Link href="/signup" className="text-[var(--color-amber)]">Create one</Link>
        </p>
      </Card>
    </main>
  );
}
