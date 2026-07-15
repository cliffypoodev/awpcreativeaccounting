import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { useSaveClient, useTags } from "@/lib/queries";
import type { ClientRow, TagRow } from "@/lib/shared";
import { errMsg } from "@/lib/format";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientRow | null;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  source: string;
  status: "active" | "inactive" | "prospect";
  tagIds: string[];
}

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  notes: "",
  source: "",
  status: "active",
  tagIds: [],
};

export function ClientDialog({ open, onOpenChange, client }: Props) {
  const save = useSaveClient();
  const { data: allTags = [] } = useTags();
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (open) {
      setForm(
        client
          ? {
              name: client.name,
              email: client.email ?? "",
              phone: client.phone ?? "",
              company: client.company ?? "",
              notes: client.notes ?? "",
              source: client.source ?? "",
              status: (client.status as FormState["status"]) ?? "active",
              tagIds: (client.tags ?? []).map((t: TagRow) => t.id),
            }
          : emptyForm
      );
    }
  }, [open, client]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleTag = (id: string) =>
    set(
      "tagIds",
      form.tagIds.includes(id) ? form.tagIds.filter((t) => t !== id) : [...form.tagIds, id]
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    save.mutate(
      {
        id: client?.id,
        input: {
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          company: form.company || null,
          notes: form.notes || null,
          source: form.source || null,
          status: form.status,
          tagIds: form.tagIds,
        },
      },
      {
        onSuccess: () => {
          toast.success(client ? "Client updated." : "Client added.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(errMsg(err)),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {client ? "Edit client" : "New client"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Name *</Label>
            <Input id="c-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">Phone</Label>
              <Input id="c-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="c-company">Company</Label>
              <Input id="c-company" value={form.company} onChange={(e) => set("company", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-source">Source / Referral</Label>
              <Input id="c-source" placeholder="e.g. Instagram, Referral" value={form.source} onChange={(e) => set("source", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-status">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as FormState["status"])}>
              <SelectTrigger id="c-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
              </SelectContent>
            </Select>
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
                      backgroundColor: form.tagIds.includes(tag.id) ? tag.color + "22" : undefined,
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
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea id="c-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : client ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
