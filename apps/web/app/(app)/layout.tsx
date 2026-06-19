import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getSessionFromHeaders } from '@/lib/auth';

const nav = [
  ['/dashboard', 'Dashboard'],
  ['/invoices', 'Invoices'],
  ['/estimates', 'Estimates'],
  ['/clients', 'Clients'],
  ['/expenses', 'Expenses'],
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromHeaders(new Headers(await headers()));
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-[var(--color-border)] p-5 md:block">
        <Link href="/dashboard" className="font-display text-lg font-semibold">
          AWP Creative
        </Link>
        <nav className="mt-8 space-y-1">
          {nav.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="block rounded-lg px-3 py-2 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-ink-muted)]">
          <p className="truncate">{session.email}</p>
          <form action="/api/auth/logout" method="post" className="mt-2">
            <button className="text-[var(--color-amber)]">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
