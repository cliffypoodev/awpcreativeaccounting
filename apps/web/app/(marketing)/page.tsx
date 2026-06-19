import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const features = [
  ['AI chat-to-invoice', 'Describe the work in plain language. We extract the client, line items, tax, and due date — and drop it straight into the editor.'],
  ['Receipt OCR + expenses', 'Snap a receipt; AI categorizes it, tags it deductible, and links it to a client or invoice.'],
  ['Stripe payments', 'Cards, Apple Pay, Google Pay, 135+ currencies. Real-time delivered / viewed / paid tracking.'],
  ['Estimates → invoices', 'Send an estimate, collect approval at a client link, convert to an invoice in one click.'],
  ['Recurring + reminders', 'Set it once. Automated reminder ladders recover overdue balances without you lifting a finger.'],
  ['Full API', 'tRPC internally, REST at /api/v1 for enterprise. Build mobile apps and integrations on top.'],
];

const comparison: [string, string, string][] = [
  ['Public API', 'None', 'Full REST + tRPC'],
  ['AI', 'Basic chat', 'Full financial assistant'],
  ['Free tier', 'None', '3 invoices / month'],
  ['Client portal', 'View-only link', 'Full portal'],
  ['Reporting', 'Basic', 'Revenue / aging / tax'],
  ['Home TTFB', '~300ms', '<100ms'],
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6">
      <nav className="flex items-center justify-between py-6">
        <span className="font-display text-xl font-semibold">
          AWP Creative
        </span>
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">Pricing</Link>
          <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link href="/signup"><Button>Start free</Button></Link>
        </div>
      </nav>

      <section className="py-20 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-amber)]">
          A superior replacement for invoicer.ai
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-5xl font-semibold leading-tight md:text-6xl">
          Invoices, estimates & expenses — <span className="text-[var(--color-amber)]">on autopilot.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--color-ink-muted)]">
          Create an invoice by typing a sentence. Get paid with Stripe. Let AI chase overdue
          balances, categorize expenses, and forecast cash flow.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup"><Button className="px-6 py-3 text-base">Start free — 3 invoices/mo</Button></Link>
          <Link href="/tools/profit-margin-calculator"><Button variant="outline" className="px-6 py-3 text-base">Try a free tool</Button></Link>
        </div>
      </section>

      <section className="grid gap-4 pb-20 md:grid-cols-3">
        {features.map(([title, body]) => (
          <Card key={title}>
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{body}</p>
          </Card>
        ))}
      </section>

      <section className="pb-24">
        <h2 className="font-display text-3xl font-semibold">Why we beat invoicer.ai</h2>
        <Card className="mt-6 overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-ink-muted)]">
                <th className="p-4 font-medium">Area</th>
                <th className="p-4 font-medium">invoicer.ai</th>
                <th className="p-4 font-medium text-[var(--color-amber)]">AWP Creative</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map(([area, them, us]) => (
                <tr key={area} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="p-4 font-medium">{area}</td>
                  <td className="p-4 text-[var(--color-ink-muted)]">{them}</td>
                  <td className="p-4 text-[var(--color-success)]">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <footer className="border-t border-[var(--color-border)] py-10 text-sm text-[var(--color-ink-muted)]">
        © {new Date().getFullYear()} AWP Creative®. All rights reserved.
      </footer>
    </main>
  );
}
