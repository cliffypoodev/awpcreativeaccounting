import { cn } from '@/lib/utils';

const tone: Record<string, string> = {
  draft: 'bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]',
  sent: 'bg-amber-500/15 text-[var(--color-amber)]',
  viewed: 'bg-amber-500/15 text-[var(--color-amber)]',
  paid: 'bg-green-500/15 text-[var(--color-success)]',
  partially_paid: 'bg-green-500/10 text-[var(--color-success)]',
  overdue: 'bg-red-500/15 text-[var(--color-danger)]',
  cancelled: 'bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        tone[status] ?? tone.draft,
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
