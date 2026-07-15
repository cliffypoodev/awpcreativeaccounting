import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FileCheck2, Pencil, Trash2, ArrowRightLeft, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useEstimates, useConvertEstimate, useDeleteEstimate } from "@/lib/queries";
import { PageHeader, EmptyState, StatusBadge, TableSkeleton } from "@/components/app/ui-bits";
import { money, shortDate, errMsg } from "@/lib/format";
import type { EstimateRow } from "@/lib/shared";
import { toast } from "sonner";

export default function Estimates() {
  const { data: estimates, isLoading } = useEstimates();
  const convert = useConvertEstimate();
  const del = useDeleteEstimate();
  const navigate = useNavigate();
  const [toDelete, setToDelete] = useState<EstimateRow | null>(null);

  const onConvert = (e: EstimateRow) => {
    convert.mutate(e.id, {
      onSuccess: (inv) => {
        toast.success(`Converted to ${inv.number}.`);
        navigate(`/app/invoices/${inv.id}`);
      },
      onError: (err) => toast.error(errMsg(err)),
    });
  };

  const onDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => toast.success("Estimate deleted."),
      onError: (err) => toast.error(errMsg(err)),
    });
    setToDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Estimates"
        subtitle="Quote work, then convert to an invoice in one click."
        action={
          <Button asChild className="gap-1">
            <Link to="/app/estimates/new">
              <Plus className="h-4 w-4" /> New estimate
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton />
      ) : estimates && estimates.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Estimate</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Client</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Issued</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Valid until</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {estimates.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <Link
                      to={`/app/estimates/${e.id}/edit`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {e.number}
                    </Link>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      {e.client?.name ?? "No client"}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {e.client?.name ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {shortDate(e.issueDate)}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {shortDate(e.expiryDate)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {money(e.total, e.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/app/estimates/${e.id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onConvert(e)}
                          disabled={!!e.convertedInvoiceId || convert.isPending}
                        >
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          {e.convertedInvoiceId ? "Already converted" : "Convert to invoice"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setToDelete(e)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={FileCheck2}
          title="No estimates yet"
          description="Send a quote to a client, then convert it to an invoice when approved."
          action={
            <Button asChild className="gap-1">
              <Link to="/app/estimates/new">
                <Plus className="h-4 w-4" /> New estimate
              </Link>
            </Button>
          }
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the estimate. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
