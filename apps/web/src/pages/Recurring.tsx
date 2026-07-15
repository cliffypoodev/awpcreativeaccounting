import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, RefreshCw, Pencil, Trash2, Play, Calendar, MoreHorizontal } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { useRecurring, useGenerateRecurring, useDeleteRecurring } from "@/lib/queries";
import { PageHeader, EmptyState, TableSkeleton } from "@/components/app/ui-bits";
import type { RecurringScheduleRow } from "@/lib/shared";
import { money, shortDate, errMsg } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  paused: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-secondary text-muted-foreground border-border",
};

export default function Recurring() {
  const { data: schedules, isLoading } = useRecurring();
  const generate = useGenerateRecurring();
  const del = useDeleteRecurring();
  const navigate = useNavigate();
  const [toDelete, setToDelete] = useState<RecurringScheduleRow | null>(null);

  const onGenerate = (s: RecurringScheduleRow) => {
    generate.mutate(s.id, {
      onSuccess: (result) => {
        toast.success(`Invoice ${result.invoiceNumber} created.`);
        navigate(`/app/invoices/${result.invoiceId}`);
      },
      onError: (err) => toast.error(errMsg(err)),
    });
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => toast.success("Schedule removed."),
      onError: (err) => toast.error(errMsg(err)),
    });
    setToDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Recurring"
        subtitle="Manage retainers, podcast billing, and repeating invoices."
        action={
          <Button asChild className="gap-1">
            <Link to="/app/recurring/new">
              <Plus className="h-4 w-4" /> New schedule
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton />
      ) : schedules && schedules.length > 0 ? (
        <div className="space-y-3">
          {schedules.map((s) => {
            const isBurndown = s.totalPrepaid > 0;
            const burndownPct = isBurndown ? Math.round((s.unitsUsed / s.totalPrepaid) * 100) : 0;
            const remaining = isBurndown ? s.totalPrepaid - s.unitsUsed : null;
            return (
              <div
                key={s.id}
                className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/app/recurring/${s.id}/edit`}
                        className="font-display font-semibold hover:text-primary"
                      >
                        {s.name}
                      </Link>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          STATUS_COLORS[s.status] ?? ""
                        )}
                      >
                        {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {FREQ_LABELS[s.frequency] ?? s.frequency}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {s.client ? <span>{s.client.name}</span> : null}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Next: {shortDate(s.nextDate)}
                      </span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {money(s.totals.total, s.currency)} / {FREQ_LABELS[s.frequency]?.toLowerCase() ?? "cycle"}
                      </span>
                    </div>
                    {isBurndown ? (
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>Retainer usage</span>
                          <span>
                            {s.unitsUsed} / {s.totalPrepaid} used
                            {remaining !== null ? ` · ${remaining} remaining` : ""}
                          </span>
                        </div>
                        <Progress value={burndownPct} className="h-2" />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {s.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => onGenerate(s)}
                        disabled={generate.isPending}
                      >
                        <Play className="h-3.5 w-3.5" /> Generate invoice
                      </Button>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/app/recurring/${s.id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setToDelete(s)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={RefreshCw}
          title="No recurring schedules"
          description="Set up retainers or podcast billing that repeat automatically."
          action={
            <Button asChild className="gap-1">
              <Link to="/app/recurring/new">
                <Plus className="h-4 w-4" /> New schedule
              </Link>
            </Button>
          }
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the schedule. Already-generated invoices are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
