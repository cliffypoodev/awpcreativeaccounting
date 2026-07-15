import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FolderOpen, Pencil, Trash2, Search } from "lucide-react";
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
import { useProjects, useDeleteProject } from "@/lib/queries";
import { PageHeader, EmptyState, TableSkeleton } from "@/components/app/ui-bits";
import { PROJECT_SERVICE_TYPES, PROJECT_STATUSES, type ProjectRow } from "@/lib/shared";
import { errMsg } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SERVICE_LABELS: Record<string, string> = {
  commercial: "Commercial",
  voiceover: "Voiceover",
  podcast: "Podcast",
  drone: "Drone",
};

const SERVICE_COLORS: Record<string, string> = {
  commercial: "bg-blue-100 text-blue-700 border-blue-200",
  voiceover: "bg-purple-100 text-purple-700 border-purple-200",
  podcast: "bg-green-100 text-green-700 border-green-200",
  drone: "bg-amber-100 text-amber-700 border-amber-200",
};

const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  quoted: "Quoted",
  booked: "Booked",
  filming_recording: "Filming / Recording",
  editing: "Editing",
  review: "Review",
  delivered: "Delivered",
  closed: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  lead: "text-muted-foreground",
  quoted: "text-blue-600",
  booked: "text-indigo-600",
  filming_recording: "text-violet-600",
  editing: "text-amber-600",
  review: "text-orange-600",
  delivered: "text-emerald-600",
  closed: "text-muted-foreground",
};

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const del = useDeleteProject();
  const [toDelete, setToDelete] = useState<ProjectRow | null>(null);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => toast.success("Project removed."),
      onError: (err) => toast.error(errMsg(err)),
    });
    setToDelete(null);
  };

  const filtered = useMemo(() => {
    if (!projects) return [];
    const q = search.toLowerCase();
    return projects.filter((p) => {
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.referenceCode.toLowerCase().includes(q) &&
        !(p.client?.name ?? "").toLowerCase().includes(q)
      )
        return false;
      if (serviceFilter !== "all" && p.serviceType !== serviceFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [projects, search, serviceFilter, statusFilter]);

  const hasFilters = search !== "" || serviceFilter !== "all" || statusFilter !== "all";

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Track shoots, recordings, and deliveries by service line."
        action={
          <Button asChild className="gap-1">
            <Link to="/app/projects/new">
              <Plus className="h-4 w-4" /> New project
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {(PROJECT_SERVICE_TYPES as readonly string[]).map((s) => (
              <SelectItem key={s} value={s}>
                {SERVICE_LABELS[s] ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(PROJECT_STATUSES as readonly string[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/app/projects/${p.id}/edit`}
                    className="truncate font-display font-semibold hover:text-primary"
                  >
                    {p.name}
                  </Link>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      SERVICE_COLORS[p.serviceType] ?? ""
                    )}
                  >
                    {SERVICE_LABELS[p.serviceType] ?? p.serviceType}
                  </span>
                  <span className={cn("text-xs font-medium", STATUS_COLORS[p.status] ?? "")}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{p.referenceCode}</span>
                  {p.client ? <span>{p.client.name}</span> : null}
                  {p.startDate ? <span>Starts {p.startDate}</span> : null}
                </div>
                {p.tags.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {p.tags.map((tag) => (
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
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link to={`/app/projects/${p.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setToDelete(p)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderOpen}
          title={hasFilters ? "No matches" : "No projects yet"}
          description={
            hasFilters
              ? "Try different search terms or filters."
              : "Create your first project to track shoots, recordings, and deliveries."
          }
          action={
            hasFilters ? undefined : (
              <Button asChild className="gap-1">
                <Link to="/app/projects/new">
                  <Plus className="h-4 w-4" /> New project
                </Link>
              </Button>
            )
          }
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => (!o ? setToDelete(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the project. Can't be undone.
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
