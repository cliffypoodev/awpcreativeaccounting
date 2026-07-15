import { useMemo, useState } from "react";
import { Plus, Users, Pencil, Trash2, Mail, Building2, Search } from "lucide-react";
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
import { useClients, useDeleteClient, useTags } from "@/lib/queries";
import { ClientDialog } from "@/components/app/ClientDialog";
import { PageHeader, EmptyState, TableSkeleton } from "@/components/app/ui-bits";
import { money, errMsg } from "@/lib/format";
import type { ClientRow, TagRow } from "@/lib/shared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  prospect: "Prospect",
};

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-secondary text-muted-foreground border-border",
  prospect: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const { data: allTags = [] } = useTags();
  const del = useDeleteClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [toDelete, setToDelete] = useState<ClientRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (c: ClientRow) => {
    setEditing(c);
    setDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => toast.success("Client removed."),
      onError: (err) => toast.error(errMsg(err)),
    });
    setToDelete(null);
  };

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.toLowerCase();
    return clients.filter((c) => {
      if (
        q &&
        !c.name.toLowerCase().includes(q) &&
        !(c.company ?? "").toLowerCase().includes(q) &&
        !(c.email ?? "").toLowerCase().includes(q)
      )
        return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (tagFilter !== "all" && !c.tags.some((t: TagRow) => t.id === tagFilter)) return false;
      return true;
    });
  }, [clients, search, statusFilter, tagFilter]);

  const hasFilters = search !== "" || statusFilter !== "all" || tagFilter !== "all";

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="The people and companies you bill."
        action={
          <Button onClick={openNew} className="gap-1">
            <Plus className="h-4 w-4" /> New client
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
          </SelectContent>
        </Select>
        {allTags.length > 0 ? (
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const status = c.status ?? "active";
            const tags: TagRow[] = c.tags ?? [];
            return (
              <div
                key={c.id}
                className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-display text-lg font-semibold">{c.name}</h3>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          STATUS_CLASSES[status] ?? STATUS_CLASSES.active
                        )}
                      >
                        {STATUS_LABELS[status] ?? status}
                      </span>
                    </div>
                    {c.company ? (
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0" /> {c.company}
                      </p>
                    ) : null}
                    {c.email ? (
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" /> {c.email}
                      </p>
                    ) : null}
                    {tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((tag) => (
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
                  <div className="ml-2 flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setToDelete(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Invoiced</p>
                    <p className="text-sm font-semibold tabular-nums">{money(c.totalInvoiced)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="text-sm font-semibold tabular-nums text-emerald-600">
                      {money(c.totalPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Due</p>
                    <p className="text-sm font-semibold tabular-nums text-amber-600">
                      {money(c.totalOutstanding)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={hasFilters ? "No matches" : "No clients yet"}
          description={
            hasFilters
              ? "Try different search terms or filters."
              : "Add your first client to start sending invoices and estimates."
          }
          action={
            hasFilters ? undefined : (
              <Button onClick={openNew} className="gap-1">
                <Plus className="h-4 w-4" /> New client
              </Button>
            )
          }
        />
      )}

      <ClientDialog open={dialogOpen} onOpenChange={setDialogOpen} client={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => (!o ? setToDelete(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the client. Their invoices stay, but lose the client link. This can't be
              undone.
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
