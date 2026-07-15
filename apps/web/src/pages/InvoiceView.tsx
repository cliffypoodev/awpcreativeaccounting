import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  Ban,
  FileText,
} from "lucide-react";
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
import { useInvoice, useInvoiceStatus, useDeleteInvoice } from "@/lib/queries";
import { StatusBadge } from "@/components/app/ui-bits";
import { money, shortDate, isOverdue, statusLabel, errMsg } from "@/lib/format";
import { paymentProgress } from "@/lib/shared";
import { toast } from "sonner";

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: inv, isLoading } = useInvoice(id);
  const statusMut = useInvoiceStatus();
  const del = useDeleteInvoice();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-secondary/60" />;
  }
  if (!inv) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button asChild variant="ghost" className="mt-4">
          <Link to="/app/invoices">Back to invoices</Link>
        </Button>
      </div>
    );
  }

  const displayStatus = isOverdue(inv.dueDate, inv.status) ? "overdue" : inv.status;
  const progress = paymentProgress(inv.total, inv.amountPaid);

  const setStatus = (status: string) => {
    statusMut.mutate(
      { id: inv.id, status },
      {
        onSuccess: () => toast.success(`Marked as ${statusLabel(status).toLowerCase()}.`),
        onError: (err) => toast.error(errMsg(err)),
      }
    );
  };

  const onDelete = () => {
    del.mutate(inv.id, {
      onSuccess: () => {
        toast.success("Invoice deleted.");
        navigate("/app/invoices");
      },
      onError: (err) => toast.error(errMsg(err)),
    });
    setConfirmDelete(false);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/app/invoices")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Invoices
        </button>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link to={`/app/invoices/${inv.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1">
                Update status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatus("sent")}>
                <Send className="mr-2 h-4 w-4" /> Mark as sent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus("paid")}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as paid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus("draft")}>
                <FileText className="mr-2 h-4 w-4" /> Move to draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatus("cancelled")} className="text-destructive">
                <Ban className="mr-2 h-4 w-4" /> Cancel invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Invoice paper */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-secondary/30 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-amber">Invoice</p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
                {inv.number}
              </h1>
              <div className="mt-2">
                <StatusBadge status={displayStatus} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Amount due</p>
              <p className="font-display text-3xl font-semibold tabular-nums text-amber">
                {money(inv.amountDue, inv.currency)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                of {money(inv.total, inv.currency)} total
              </p>
            </div>
          </div>

          {inv.fromEstimateId ? (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs text-accent-foreground">
              Converted from an estimate
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Billed to
            </p>
            <p className="mt-1 font-medium">{inv.client?.name ?? "No client"}</p>
            {inv.client?.company ? (
              <p className="text-sm text-muted-foreground">{inv.client.company}</p>
            ) : null}
            {inv.client?.email ? (
              <p className="text-sm text-muted-foreground">{inv.client.email}</p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <div className="flex justify-between sm:block">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Issued
              </p>
              <p className="text-sm">{shortDate(inv.issueDate)}</p>
            </div>
            <div className="mt-2 flex justify-between sm:block">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Due
              </p>
              <p className="text-sm">{shortDate(inv.dueDate)}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="px-6 sm:px-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="hidden py-2 text-right font-medium sm:table-cell">Unit</th>
                <th className="hidden py-2 text-right font-medium sm:table-cell">Tax</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it) => (
                <tr key={it.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-2">{it.description}</td>
                  <td className="py-3 text-right tabular-nums">{it.quantity}</td>
                  <td className="hidden py-3 text-right tabular-nums sm:table-cell">
                    {money(it.unitPrice, inv.currency)}
                  </td>
                  <td className="hidden py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                    {it.taxRate}%
                  </td>
                  <td className="py-3 text-right font-medium tabular-nums">
                    {money(it.amount, inv.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end px-6 py-6 sm:px-8">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <Row label="Subtotal" value={money(inv.subtotal, inv.currency)} />
            <Row label="Tax" value={money(inv.taxAmount, inv.currency)} />
            {inv.discountAmount > 0 ? (
              <Row
                label="Discount"
                value={`− ${money(inv.discountAmount, inv.currency)}`}
                valueClass="text-emerald-600"
              />
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 font-medium">
              <span>Total</span>
              <span className="tabular-nums">{money(inv.total, inv.currency)}</span>
            </div>
            {inv.total - inv.amountDue > 0 ? (
              <Row
                label="Paid"
                value={`− ${money(inv.total - inv.amountDue, inv.currency)}`}
                valueClass="text-emerald-600"
              />
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 font-display text-base font-semibold">
              <span>Amount due</span>
              <span className="tabular-nums text-amber">{money(inv.amountDue, inv.currency)}</span>
            </div>
            {progress > 0 && progress < 100 ? (
              <div className="pt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{progress}% paid</p>
              </div>
            ) : null}
          </div>
        </div>

        {inv.notes || inv.terms ? (
          <div className="grid gap-4 border-t border-border p-6 sm:grid-cols-2 sm:p-8">
            {inv.notes ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{inv.notes}</p>
              </div>
            ) : null}
            {inv.terms ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Terms
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{inv.terms}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {inv.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the invoice and its line items. This can't be undone.
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

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}
