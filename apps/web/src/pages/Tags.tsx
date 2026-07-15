import { useState } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useTags, useSaveTag, useDeleteTag } from "@/lib/queries";
import { PageHeader, EmptyState, TableSkeleton } from "@/components/app/ui-bits";
import type { TagRow } from "@/lib/shared";
import { errMsg } from "@/lib/format";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#6b7280",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

interface FormState {
  name: string;
  color: string;
}

export default function Tags() {
  const { data: tags, isLoading } = useTags();
  const save = useSaveTag();
  const del = useDeleteTag();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TagRow | null>(null);
  const [toDelete, setToDelete] = useState<TagRow | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", color: "#6b7280" });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", color: "#6b7280" });
    setDialogOpen(true);
  };

  const openEdit = (t: TagRow) => {
    setEditing(t);
    setForm({ name: t.name, color: t.color });
    setDialogOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    save.mutate(
      { id: editing?.id, input: { name: form.name.trim(), color: form.color } },
      {
        onSuccess: () => {
          toast.success(editing ? "Tag updated." : "Tag created.");
          setDialogOpen(false);
        },
        onError: (err) => toast.error(errMsg(err)),
      }
    );
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => toast.success("Tag removed."),
      onError: (err) => toast.error(errMsg(err)),
    });
    setToDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Tags"
        subtitle="Organize clients and projects with labels."
        action={
          <Button onClick={openNew} className="gap-1">
            <Plus className="h-4 w-4" /> New tag
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton />
      ) : tags && tags.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((t) => (
            <div
              key={t.id}
              className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="font-medium">{t.name}</span>
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(t)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setToDelete(t)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Tag}
          title="No tags yet"
          description="Create tags to organize your clients and projects."
          action={
            <Button onClick={openNew} className="gap-1">
              <Plus className="h-4 w-4" /> New tag
            </Button>
          }
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editing ? "Edit tag" : "New tag"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="t-name">Name *</Label>
              <Input
                id="t-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="e.g. Rush, VIP, Retainer"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: form.color === color ? "white" : "transparent",
                      boxShadow: form.color === color ? `0 0 0 2px ${color}` : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : editing ? "Save changes" : "Create tag"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => (!o ? setToDelete(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove tag "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the tag from all clients and projects. Can't be undone.
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
