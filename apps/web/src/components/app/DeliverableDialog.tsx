import { useEffect, useMemo, useState } from "react";
import { Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects, useInvoices, useTags, useSaveDeliverable } from "@/lib/queries";
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  DELIVERABLE_STATUSES,
  DELIVERABLE_STATUS_LABELS,
  suggestDeliverableName,
  type DeliverableRow,
  type DeliverableInput,
} from "@/lib/shared";
import { errMsg } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: DeliverableRow | null;
  /** Pre-select a project when opening fresh (e.g. from a project page). */
  defaultProjectId?: string;
}

interface FormState {
  projectId: string;
  invoiceId: string; // "" = none
  assetType: string;
  status: string;
  name: string;
  fileUrl: string;
  fileFormat: string;
  fileSize: string;
  deliveredAt: string;
  notes: string;
  tagIds: string[];
}

const emptyForm = (projectId = ""): FormState => ({
  projectId,
  invoiceId: "",
  assetType: ASSET_TYPES[0],
  status: "draft",
  name: "",
  fileUrl: "",
  fileFormat: "",
  fileSize: "",
  deliveredAt: "",
  notes: "",
  tagIds: [],
});

export function DeliverableDialog({ open, onOpenChange, editing, defaultProjectId }: Props) {
  const { data: projects } = useProjects();
  const { data: invoices } = useInvoices();
  const { data: tags } = useTags();
  const save = useSaveDeliverable();

  const [form, setForm] = useState<FormState>(emptyForm(defaultProjectId));

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        projectId: editing.projectId,
        invoiceId: editing.invoiceId ?? "",
        assetType: editing.assetType,
        status: editing.status,
        name: editing.name,
        fileUrl: editing.fileUrl ?? "",
        fileFormat: editing.fileFormat ?? "",
        fileSize: editing.fileSize ?? "",
        deliveredAt: editing.deliveredAt ?? "",
        notes: editing.notes ?? "",
        tagIds: editing.tags.map((t) => t.id),
      });
    } else {
      setForm(emptyForm(defaultProjectId));
    }
  }, [open, editing, defaultProjectId]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const selectedProject = projects?.find((p) => p.id === form.projectId);

  // Invoices that belong to the chosen project (or all, if none chosen).
  const projectInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((i) => (form.projectId ? i.projectId === form.projectId : false));
  }, [invoices, form.projectId]);

  // Live preview of the auto-generated name (when the user hasn't typed one).
  const namePreview = selectedProject
    ? suggestDeliverableName(selectedProject.referenceCode, form.assetType, editing?.version ?? 1)
    : "";

  const toggleTag = (tagId: string) =>
    set(
      "tagIds",
      form.tagIds.includes(tagId)
        ? form.tagIds.filter((t) => t !== tagId)
        : [...form.tagIds, tagId]
    );

  const handleSave = () => {
    if (!form.projectId) {
      toast.error("Choose a project for this deliverable.");
      return;
    }
    const input: DeliverableInput = {
      projectId: form.projectId,
      invoiceId: form.invoiceId || null,
      name: form.name.trim() || null,
      assetType: form.assetType as DeliverableInput["assetType"],
      status: form.status as DeliverableInput["status"],
      fileUrl: form.fileUrl.trim() || null,
      fileFormat: form.fileFormat.trim() || null,
      fileSize: form.fileSize.trim() || null,
      deliveredAt: form.deliveredAt || null,
      notes: form.notes.trim() || null,
      tagIds: form.tagIds,
    };
    save.mutate(
      { id: editing?.id, input },
      {
        onSuccess: () => {
          toast.success(editing ? "Deliverable updated." : "Deliverable catalogued.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(errMsg(err)),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!save.isPending ? onOpenChange(o) : undefined)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Package className="h-5 w-5 text-primary" />
            {editing ? "Edit deliverable" : "Catalog a deliverable"}
          </DialogTitle>
          <DialogDescription>
            Record a final asset and link it to its project and (optionally) the invoice it was
            delivered under.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project + asset type */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Project</Label>
              <Select value={form.projectId} onValueChange={(v) => set("projectId", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {(projects ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Asset type</Label>
              <Select value={form.assetType} onValueChange={(v) => set("assetType", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(ASSET_TYPES as readonly string[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {ASSET_TYPE_LABELS[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name (auto if blank) */}
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input
              className="h-9 font-mono"
              placeholder={namePreview || "Auto-generated if left blank"}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            {!form.name && namePreview ? (
              <p className="text-[11px] text-muted-foreground">
                Will be named <span className="font-mono">{namePreview}</span>
              </p>
            ) : null}
          </div>

          {/* Status + linked invoice */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(DELIVERABLE_STATUSES as readonly string[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {DELIVERABLE_STATUS_LABELS[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Delivered under invoice</Label>
              <Select
                value={form.invoiceId || "none"}
                onValueChange={(v) => set("invoiceId", v === "none" ? "" : v)}
                disabled={!form.projectId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projectInvoices.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File metadata */}
          <div className="space-y-1">
            <Label className="text-xs">File link (optional)</Label>
            <Input
              className="h-9"
              placeholder="https://drive.google.com/…"
              value={form.fileUrl}
              onChange={(e) => set("fileUrl", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Format</Label>
              <Input
                className="h-9"
                placeholder="ProRes, WAV…"
                value={form.fileFormat}
                onChange={(e) => set("fileFormat", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Size</Label>
              <Input
                className="h-9"
                placeholder="1.2 GB"
                value={form.fileSize}
                onChange={(e) => set("fileSize", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Delivered on</Label>
              <Input
                className="h-9"
                type="date"
                value={form.deliveredAt}
                onChange={(e) => set("deliveredAt", e.target.value)}
              />
            </div>
          </div>

          {/* Tags */}
          {tags && tags.length > 0 ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Tags (asset-type & service tags are added automatically)</Label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const active = form.tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        active ? "" : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                      style={{
                        borderColor: active ? tag.color : undefined,
                        backgroundColor: active ? tag.color + "22" : undefined,
                        color: active ? tag.color : undefined,
                      }}
                    >
                      {tag.name}
                      {active ? <X className="h-3 w-3" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Director's cut, color-graded, client-approved."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={save.isPending || !form.projectId}>
              {save.isPending ? "Saving…" : editing ? "Save changes" : "Add to catalog"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
