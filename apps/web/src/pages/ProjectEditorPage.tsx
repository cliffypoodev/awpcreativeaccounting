import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProject, useSaveProject, useClients, useTags } from "@/lib/queries";
import {
  PROJECT_SERVICE_TYPES,
  PROJECT_STATUSES,
  type ProjectInput,
} from "@/lib/shared";
import { errMsg } from "@/lib/format";
import { toast } from "sonner";

const SERVICE_LABELS: Record<string, string> = {
  commercial: "Commercial Video",
  voiceover: "Voiceover",
  podcast: "Podcast Production",
  drone: "Drone Services",
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

interface FormState {
  clientId: string;
  name: string;
  serviceType: string;
  status: string;
  description: string;
  startDate: string;
  endDate: string;
  notes: string;
  tagIds: string[];
}

const emptyForm: FormState = {
  clientId: "",
  name: "",
  serviceType: "commercial",
  status: "lead",
  description: "",
  startDate: "",
  endDate: "",
  notes: "",
  tagIds: [],
};

export default function ProjectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { data: project, isLoading } = useProject(id);
  const { data: clients = [] } = useClients();
  const { data: allTags = [] } = useTags();
  const save = useSaveProject();
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (project) {
      setForm({
        clientId: project.clientId ?? "",
        name: project.name,
        serviceType: project.serviceType,
        status: project.status,
        description: project.description ?? "",
        startDate: project.startDate ?? "",
        endDate: project.endDate ?? "",
        notes: project.notes ?? "",
        tagIds: project.tags.map((t) => t.id),
      });
    }
  }, [project]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleTag = (tagId: string) =>
    set(
      "tagIds",
      form.tagIds.includes(tagId)
        ? form.tagIds.filter((t) => t !== tagId)
        : [...form.tagIds, tagId]
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const input: ProjectInput = {
      clientId: form.clientId || null,
      name: form.name,
      serviceType: form.serviceType as ProjectInput["serviceType"],
      status: form.status as ProjectInput["status"],
      description: form.description || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      notes: form.notes || null,
      tagIds: form.tagIds,
    };
    save.mutate(
      { id, input },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Project updated." : "Project created.");
          navigate("/app/projects");
        },
        onError: (err) => toast.error(errMsg(err)),
      }
    );
  };

  return isEdit && isLoading ? (
    <div className="h-96 animate-pulse rounded-xl bg-secondary/60" />
  ) : (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-semibold">
          {isEdit ? "Edit project" : "New project"}
        </h1>
      </div>

      <form
        onSubmit={submit}
        className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="p-name">Project name *</Label>
          <Input
            id="p-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            placeholder="e.g. Spring Campaign"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="p-service">Service type *</Label>
            <Select value={form.serviceType} onValueChange={(v) => set("serviceType", v)}>
              <SelectTrigger id="p-service">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(PROJECT_SERVICE_TYPES as readonly string[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SERVICE_LABELS[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-status">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger id="p-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(PROJECT_STATUSES as readonly string[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="p-client">Client</Label>
          <Select
            value={form.clientId || "_none"}
            onValueChange={(v) => set("clientId", v === "_none" ? "" : v)}
          >
            <SelectTrigger id="p-client">
              <SelectValue placeholder="No client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No client</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="p-start">Start date</Label>
            <Input
              id="p-start"
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-end">End / delivery date</Label>
            <Input
              id="p-end"
              type="date"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="p-desc">Description</Label>
          <Textarea
            id="p-desc"
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Brief description of scope"
          />
        </div>

        {allTags.length > 0 ? (
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors"
                  style={{
                    borderColor: form.tagIds.includes(tag.id) ? tag.color : undefined,
                    backgroundColor: form.tagIds.includes(tag.id)
                      ? tag.color + "22"
                      : undefined,
                    color: form.tagIds.includes(tag.id) ? tag.color : undefined,
                  }}
                >
                  {tag.name}
                  {form.tagIds.includes(tag.id) ? <X className="h-3 w-3" /> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="p-notes">Notes</Label>
          <Textarea
            id="p-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Internal notes"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="ghost" asChild>
            <Link to="/app/projects">Cancel</Link>
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
