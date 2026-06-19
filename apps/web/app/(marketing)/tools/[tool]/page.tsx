import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FREE_TOOLS } from '@invoiceforge/shared';
import { ProfitMarginCalculator, HourlyRateCalculator } from './widgets';

export function generateStaticParams() {
  return FREE_TOOLS.map((t) => ({ tool: t.slug }));
}

function findTool(slug: string) {
  return FREE_TOOLS.find((t) => t.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const meta = findTool(tool);
  if (!meta) return { title: 'Tool not found' };
  return {
    title: `${meta.name} — Free Tool | AWP Creative`,
    description: `Free ${meta.name.toLowerCase()} for freelancers and small businesses. No signup, runs entirely in your browser.`,
  };
}

const widgets: Record<string, () => React.ReactNode> = {
  'profit-margin-calculator': () => <ProfitMarginCalculator />,
  'hourly-rate-calculator': () => <HourlyRateCalculator />,
};

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const meta = findTool(tool);
  if (!meta) notFound();

  const Widget = widgets[tool];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: meta.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/" className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">← All tools</Link>
      <h1 className="mt-6 font-display text-4xl font-semibold">{meta.name}</h1>
      <p className="mt-2 text-[var(--color-ink-muted)]">Free, private, and instant. Nothing leaves your browser.</p>

      {Widget ? (
        Widget()
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-ink-muted)]">
          Interactive <strong className="text-[var(--color-ink)]">{meta.name}</strong> widget — scaffolded.
          <br />
          Implement in <code className="font-mono text-[var(--color-amber)]">tools/[tool]/widgets.tsx</code> (blueprint §11).
        </div>
      )}

      <article className="prose prose-invert mt-12 max-w-none text-[var(--color-ink-muted)]">
        <p>
          The {meta.name.toLowerCase()} is one of 20 free tools AWP Creative offers to help freelancers
          and small businesses run the numbers before they bill. Each tool is client-side, so your
          figures stay on your device. When you&apos;re ready to send a real invoice, you can do it in
          seconds with the full app.
        </p>
      </article>
    </main>
  );
}
