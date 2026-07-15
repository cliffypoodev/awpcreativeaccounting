import { useMemo, useState } from "react";
import { Plus, Receipt, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useExpenses, useDeleteExpense } from "@/lib/queries";
import { ExpenseDialog } from "@/components/app/ExpenseDialog";
import { PageHeader, EmptyState, TableSkeleton } from "@/components/app/ui-bits";
import { money, shortDate, errMsg } from "@/lib/format";
import type { ExpenseRow } from "@/lib/shared";
import { toast } from "sonner";

export default function Expenses() {
  const { data: expenses, isLoading } = useExpenses();
  const del = useDeleteExpense();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [toDelete, setToDelete] = useState<ExpenseRow | null>(null);

  const { total, deductible } = useMemo(() => {
    const list = expenses ?? [];
    return {
      total: list.reduce((s, e) => s + e.amount, 0),
      deductible: list.filter((e) => e.taxDeductible).reduce((s, e) => s + e.amount, 0),
    };
  }, [expenses]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (e: ExpenseRow) => {
    setEditing(e);
    setDialogOpen(true);
  };

  const onDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => toast.success("Expense removed."),
      onError: (err) => toast.error(errMsg(err)),
    });
    setToDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Track spending and what's tax-deductible."
        action={
          <Button onClick={openNew} className="gap-1">
            <Plus className="h-4 w-4" /> New expense
          </Button>
        }
      />

      {expenses && expenses.length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Total expenses</p>
            <p className="font-display text-2xl font-semibold tabular-nums">{money(total)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Tax deductible</p>
            <p className="font-display text-2xl font-semibold tabular-nums text-emerald-600">
              {money(deductible)}
            </p>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <TableSkeleton />
      ) : expenses && expenses.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Category</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Date</th>
                <th className="px-4 py-3 font-medium">Deductible</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="group border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{e.vendor ?? "—"}</p>
                    {e.description ? (
                      <p className="truncate text-xs text-muted-foreground">{e.description}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground sm:hidden">{e.category ?? ""}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {e.category ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {shortDate(e.date)}
                  </td>
                  <td className="px-4 py-3">
                    {e.taxDeductible ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {money(e.amount, e.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Log your business spending to track deductibles and net profit."
          action={
            <Button onClick={openNew} className="gap-1">
              <Plus className="h-4 w-4" /> New expense
            </Button>
          }
        />
      )}

      <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} expense={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the expense. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
