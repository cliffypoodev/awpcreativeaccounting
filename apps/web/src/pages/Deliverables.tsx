import { useMemo, useState } from "react";
import { Plus, Package, Pencil, Trash2, Search, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useDeliverables, useDeleteDeliverable } from "@/lib/queries";
import { PageHeader, EmptyState, TableSkeleton } from "@/components/app/ui-bits";
import { DeliverableDialog } from "@/components/app/DeliverableDialog";
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  DELIVERABLE_STATUSES,
  DELIVERABLE_STATUS_LABELS,
  type DeliverableRow,
} from "@/lib/shared";
import { errMsg, shortDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ASSET_COLORS: Record<string, string> = {
  final_video: "bg-blue-100 text-blue-700 border-blue-200",
  voiceover_take: "bg-purple-100 text-purple-700 border-purple-200",
  podcast_episode: "bg-green-100 text-green-700 border-green-200",
  drone_footage: "bg-amber-100 text-amber-700 border-amber-200",
  photo: "bg-rose-100 text-rose-700 border-rose-200",
  graphic: "bg-cyan-100 text-cyan-700 border-cyan-200",
  other: "bg-stone-100 text-stone-600 border-stone-200",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "text-muted-foreground",
  in_review: "text-amber-600",
  approved: "text-indigo-600",
  delivered: "text-emerald-600",
};

export default function Deliverables() {
  const { data: deliverables, isLoading } = useDeliverables();
  const del = useDeleteDeliverable();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeliverableRow | null>(null);
  const [toDelete, setToDelete] = useState<DeliverableRow | null>(null);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (d: DeliverableRow) => {
    setEditing(d);
    setDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => toast.success("Deliverable removed."),
      onError: (err) => toast.error(errMsg(err)),
    });
    setToDelete(null);
  };

  const filtered = useMemo(() => {
    if (!deliverables) return [];
    const q = search.toLowerCase();
    return deliverables.filter((d) => {
      if (
        q &&
        !d.name.toLowerCase().includes(q) &&
        !(d.project?.name ?? "").toLowerCase().includes(q) &&
        !(d.project?.referenceCode ?? "").toLowerCase().includes(q) &&
        !d.tags.some((t) => t.name.toLowerCase().includes(q)) &&
        !(d.notes ?? "").toLowerCase().includes(q)
      )
        return false;
      if (typeFilter !== "all" && d.assetType !== typeFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    });
  }, [deliverables, search, typeFilter, statusFilter]);

  const hasFilters = search !== "" || typeFilter !== "all" || statusFilter !== "all";

  return (
    <div>
      <PageHeader
        title="Deliverables"
        subtitle="Catalog the final assets produced for every project — searchable across your whole studio."
        action={
          <Button className="gap-1" onClick={openNew}>
            <Plus className="h-4 w-4" /> Add deliverable
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, project, tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Asset type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(ASSET_TYPES as readonly string[]).map((t) => (
              <SelectItem key={t} value={t}>
                {ASSET_TYPE_LABELS[t] ?? t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(DELIVERABLE_STATUSES as readonly string[]).map((s) => (
              <SelectItem key={s} value={s}>
                {DELIVERABLE_STATUS_LABELS[s] ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="group flex items-start gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openEdit(d)}
                    className="truncate font-mono text-sm font-semibold hover:text-primary"
                  >
                    {d.name}
                  </button>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      ASSET_COLORS[d.assetType] ?? ASSET_COLORS.other
                    )}
                  >
                    {ASSET_TYPE_LABELS[d.assetType] ?? d.assetType}
                  </span>
                  <span className={cn("text-xs font-medium", STATUS_COLORS[d.status] ?? "")}>
                    {DELIVERABLE_STATUS_LABELS[d.status] ?? d.status}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {d.project ? (
                    <span>
                      <span className="font-mono">{d.project.referenceCode}</span> · {d.project.name}
                    </span>
                  ) : null}
                  {d.invoice ? <span>Invoice {d.invoice.number}</span> : null}
                  {d.fileFormat ? <span>{d.fileFormat}</span> : null}
                  {d.fileSize ? <span>{d.fileSize}</span> : null}
                  {d.deliveredAt ? <span>Delivered {shortDate(d.deliveredAt)}</span> : null}
                  {d.fileUrl ? (
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> File
                    </a>
                  ) : null}
                </div>
                {d.tags.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {d.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: tag.color + "22", color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(d)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setToDelete(d)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title={hasFilters ? "No matches" : "No deliverables yet"}
          description={
            hasFilters
              ? "Try different search terms or filters."
              : "Catalog your final videos, voiceover takes, podcast episodes, and drone footage to keep everything organized."
          }
          action={
            hasFilters ? undefined : (
              <Button className="gap-1" onClick={openNew}>
                <Plus className="h-4 w-4" /> Add deliverable
              </Button>
            )
          }
        />
      )}

      <DeliverableDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => (!o ? setToDelete(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the deliverable from your catalog. Can't be undone.
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
