import { Link } from "react-router-dom";
import {
  Wallet,
  Clock,
  AlertTriangle,
  TrendingUp,
  Plus,
  Sparkles,
  ArrowRight,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDashboard, useMe, useSeedDemo } from "@/lib/queries";
import { StatCard } from "@/components/app/StatCard";
import { RevenueChart } from "@/components/app/RevenueChart";
import { PageHeader, StatusBadge, TableSkeleton } from "@/components/app/ui-bits";
import { money, shortDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: me } = useMe();
  const { data: stats, isLoading } = useDashboard();
  const seed = useSeedDemo();

  const firstName = me?.user.name?.split(" ")[0] ?? "there";
  const isEmpty =
    !!stats &&
    stats.clientCount === 0 &&
    stats.recentInvoices.length === 0 &&
    stats.expensesTotal === 0;

  const handleSeed = () => {
    seed.mutate(undefined, {
      onSuccess: (r) => toast.success(r.seeded ? "Demo data added." : "Workspace already has data."),
      onError: () => toast.error("Couldn't add demo data."),
    });
  };

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Here's how your business is doing."
        action={
          <Button asChild>
            <Link to="/app/invoices/new" className="gap-1">
              <Plus className="h-4 w-4" /> New invoice
            </Link>
          </Button>
        }
      />

      {isEmpty ? (
        <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-dashed border-primary/40 bg-accent/40 p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold">Start with sample data</h3>
              <p className="text-sm text-muted-foreground">
                Add a few demo clients, invoices and expenses to explore the app instantly.
              </p>
            </div>
          </div>
          <Button onClick={handleSeed} disabled={seed.isPending} className="shrink-0 gap-1">
            {seed.isPending ? "Adding…" : "Add demo data"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Revenue collected"
          value={money(stats?.revenue ?? 0)}
          hint={`${stats?.paidCount ?? 0} invoices paid`}
          icon={Wallet}
          accent="emerald"
        />
        <StatCard
          label="Outstanding"
          value={money(stats?.outstanding ?? 0)}
          hint="Awaiting payment"
          icon={Clock}
          accent="amber"
        />
        <StatCard
          label="Overdue"
          value={money(stats?.overdue ?? 0)}
          hint="Past due date"
          icon={AlertTriangle}
          accent="rose"
        />
        <StatCard
          label="Net profit"
          value={money(stats?.netProfit ?? 0)}
          hint={`${money(stats?.expensesTotal ?? 0)} expenses`}
          icon={TrendingUp}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Revenue vs expenses</h2>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          {stats ? <RevenueChart data={stats.monthly} /> : <div className="h-64 animate-pulse rounded-lg bg-secondary/60" />}
          <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Revenue
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" /> Expenses
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">Recent invoices</h2>
          {isLoading ? (
            <TableSkeleton rows={4} />
          ) : stats && stats.recentInvoices.length > 0 ? (
            <div className="space-y-1">
              {stats.recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/app/invoices/${inv.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {inv.client?.name ?? "No client"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.number} · {shortDate(inv.issueDate)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">
                      {money(inv.total, inv.currency)}
                    </span>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No invoices yet.</p>
          )}
          <Button asChild variant="ghost" className="mt-3 w-full">
            <Link to="/app/invoices">View all invoices</Link>
          </Button>
        </div>
      </div>

      {/* Tax set-aside + Cash flow row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Tax set-aside meter */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Tax set-aside</h2>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
              {stats?.taxSetAsidePercent ?? 25}%
            </span>
          </div>
          <p className="mb-4 text-3xl font-semibold tabular-nums">
            {money(stats?.taxSetAside ?? 0)}
          </p>
          <Progress
            value={stats?.taxSetAsidePercent ?? 25}
            className="mb-3 h-2"
          />
          <p className="text-xs text-muted-foreground">
            Based on {stats?.taxSetAsidePercent ?? 25}% of{" "}
            {money(stats?.revenue ?? 0)} total invoices paid.
          </p>
          <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2 text-xs">
            <Link to="/app/settings">Change percentage →</Link>
          </Button>
        </div>

        {/* 90-day cash flow forecast */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-lg font-semibold">90-day cash flow</h2>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-center">
              <p className="text-xs text-rose-600 font-medium mb-1">Overdue</p>
              <p className="text-sm font-semibold tabular-nums text-rose-700">
                {money(stats?.cashFlow?.overdueTotal ?? 0)}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
              <p className="text-xs text-amber-600 font-medium mb-1">Due in 30d</p>
              <p className="text-sm font-semibold tabular-nums text-amber-700">
                {money(stats?.cashFlow?.next30Days ?? 0)}
              </p>
            </div>
            <div className="rounded-lg bg-sky-50 border border-sky-100 p-3 text-center">
              <p className="text-xs text-sky-600 font-medium mb-1">Due in 90d</p>
              <p className="text-sm font-semibold tabular-nums text-sky-700">
                {money(stats?.cashFlow?.next90Days ?? 0)}
              </p>
            </div>
          </div>
          {isLoading ? (
            <TableSkeleton rows={3} />
          ) : (stats?.cashFlow?.items ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No upcoming cash flow items.
            </p>
          ) : (
            <div className="space-y-1">
              {(stats?.cashFlow?.items ?? []).slice(0, 10).map((item) => (
                <div
                  key={item.referenceId}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-secondary/60 transition-colors"
                >
                  <span className="shrink-0 rounded border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {shortDate(item.date)}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm">{item.label}</p>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {money(item.amount, item.currency)}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      item.type === "overdue"
                        ? "bg-rose-100 text-rose-700 border-rose-200"
                        : item.type === "invoice_due"
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-sky-100 text-sky-700 border-sky-200"
                    )}
                  >
                    {item.type === "overdue"
                      ? "Overdue"
                      : item.type === "invoice_due"
                      ? "Upcoming"
                      : "Recurring"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
