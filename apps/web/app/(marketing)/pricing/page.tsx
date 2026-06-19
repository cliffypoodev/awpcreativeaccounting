import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PLANS, type PlanId } from '@invoiceforge/shared';

const order: PlanId[] = ['free', 'starter', 'pro', 'business', 'enterprise'];

const perks: Record<PlanId, string[]> = {
  free: ['3 invoices / month', '1 seat', 'Stripe payments', 'PDF download'],
  starter: ['Unlimited invoices', '1 seat', 'AI chat-to-invoice', 'Recurring + reminders'],
  pro: ['Everything in Starter', '3 seats', 'Receipt OCR', 'Reports + client portal'],
  business: ['Everything in Pro', 'Unlimited seats', 'REST API + webhooks', 'AI forecasting'],
  enterprise: ['SSO + audit logs', 'Embeddable editor', 'Dedicated support', 'Custom SLAs'],
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <Link href="/" className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">← Back</Link>
      <h1 className="mt-6 font-display text-4xl font-semibold">Simple, honest pricing</h1>
      <p className="mt-2 text-[var(--color-ink-muted)]">Lower barrier than invoicer.ai — start free, no card required.</p>

      <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {order.map((id) => {
          const plan = PLANS[id];
          const featured = id === 'pro';
          return (
            <Card
              key={id}
              className={featured ? 'border-[var(--color-amber)] ring-1 ring-[var(--color-amber)]' : ''}
            >
              <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-semibold">
                {plan.monthly === null ? 'Custom' : plan.monthly === 0 ? '$0' : `$${plan.monthly}`}
                {plan.monthly ? <span className="text-sm text-[var(--color-ink-muted)]">/mo</span> : null}
              </p>
              {plan.annualMonthly && plan.monthly ? (
                <p className="text-xs text-[var(--color-ink-muted)]">${plan.annualMonthly}/mo billed annually</p>
              ) : (
                <p className="text-xs text-transparent">.</p>
              )}
              <ul className="mt-4 space-y-2 text-sm text-[var(--color-ink-muted)]">
                {perks[id].map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
              <Link href="/signup" className="mt-5 block">
                <Button variant={featured ? 'primary' : 'outline'} className="w-full">
                  {id === 'enterprise' ? 'Contact sales' : 'Get started'}
                </Button>
              </Link>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
