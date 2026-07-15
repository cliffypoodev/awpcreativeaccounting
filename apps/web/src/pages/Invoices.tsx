import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInvoices } from "@/lib/queries";
import { PageHeader, EmptyState, StatusBadge, TableSkeleton } from "@/components/app/ui-bits";
import { money, shortDate, isOverdue } from "@/lib/format";

const FILTERS = ["all", "draft", "sent", "paid", "overdue"] as const;
type Filter = (typeof FILTERS)[number];

export default function Invoices() {
  const { data: invoices, isLoading } = useInvoices();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    let list = invoices ?? [];
    if (filter === "overdue") {
      list = list.filter((i) => isOverdue(i.dueDate, i.status));
    } else if (filter !== "all") {
      list = list.filter((i) => i.status === filter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.number.toLowerCase().includes(q) ||
          (i.client?.name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, filter, search]);

  const displayStatus = (i: { status: string; dueDate: string }) =>
    isOverdue(i.dueDate, i.status) ? "overdue" : i.status;

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Create, send and track every bill."
        action={
          <Button asChild className="gap-1">
            <Link to="/app/invoices/new">
              <Plus className="h-4 w-4" /> New invoice
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search number or client"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : rows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Client</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Issued</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <Link to={`/app/invoices/${i.id}`} className="font-medium text-foreground hover:text-primary">
                      {i.number}
                    </Link>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      {i.client?.name ?? "No client"}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {i.client?.name ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {shortDate(i.issueDate)}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {shortDate(i.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={displayStatus(i)} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {money(i.total, i.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={search || filter !== "all" ? "No matching invoices" : "No invoices yet"}
          description={
            search || filter !== "all"
              ? "Try a different filter or search term."
              : "Create your first invoice and start getting paid."
          }
          action={
            <Button asChild className="gap-1">
              <Link to="/app/invoices/new">
                <Plus className="h-4 w-4" /> New invoice
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
