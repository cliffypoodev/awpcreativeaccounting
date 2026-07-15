import { useState } from "react";
import { Trash2, Plus, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { useProjectCosts, useSaveProjectCost, useDeleteProjectCost } from "@/lib/queries";
import {
  PROJECT_COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  COMMON_CURRENCIES,
} from "@/lib/shared";
import type { ProjectCostInput } from "@/lib/shared";
import { todayISO, money, errMsg } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  gear_rental: "bg-blue-100 text-blue-700 border-blue-200",
  talent_fees: "bg-purple-100 text-purple-700 border-purple-200",
  contractor_hours: "bg-amber-100 text-amber-700 border-amber-200",
  insurance: "bg-emerald-100 text-emerald-700 border-emerald-200",
  misc: "bg-stone-100 text-stone-600 border-stone-200",
};

interface Props {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  category: string;
  description: string;
  amount: string;
  currency: string;
  date: string;
}

const defaultForm = (): FormState => ({
  category: PROJECT_COST_CATEGORIES[0],
  description: "",
  amount: "",
  currency: "USD",
  date: todayISO(),
});

export function ProjectCostDialog({ projectId, projectName, open, onOpenChange }: Props) {
  const { data: costs, isLoading } = useProjectCosts(projectId);
  const save = useSaveProjectCost();
  const del = useDeleteProjectCost();
  const [form, setForm] = useState<FormState>(defaultForm());

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const total = (costs ?? []).reduce((sum, c) => sum + c.amount, 0);
  const defaultCurrency = costs?.[0]?.currency ?? "USD";

  const handleAdd = () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    const input: ProjectCostInput = {
      projectId,
      category: form.category as ProjectCostInput["category"],
      description: form.description.trim() || null,
      amount: amt,
      currency: form.currency,
      date: form.date,
      notes: null,
    };
    save.mutate(
      { projectId, input },
      {
        onSuccess: () => {
          setForm(defaultForm());
          toast.success("Cost added.");
        },
        onError: (err) => toast.error(errMsg(err)),
      }
    );
  };

  const handleDelete = (id: string) => {
    del.mutate(
      { projectId, id },
      {
        onSuccess: () => toast.success("Cost removed."),
        onError: (err) => toast.error(errMsg(err)),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Project costs — {projectName}
          </DialogTitle>
        </DialogHeader>

        {/* Existing costs list */}
        <div className="space-y-1">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-secondary/60" />
              ))}
            </div>
          ) : (costs ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No costs yet. Add one below.
            </p>
          ) : (
            <>
              {(costs ?? []).map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5"
                >
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      CATEGORY_COLORS[cost.category] ?? "bg-stone-100 text-stone-600 border-stone-200"
                    )}
                  >
                    {COST_CATEGORY_LABELS[cost.category] ?? cost.category}
                  </span>
                  <div className="min-w-0 flex-1">
                    {cost.description ? (
                      <p className="truncate text-sm">{cost.description}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">{cost.date}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {money(cost.amount, cost.currency)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(cost.id)}
                    disabled={del.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{money(total, defaultCurrency)}</span>
              </div>
            </>
          )}
        </div>

        {/* Add cost form */}
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Add cost
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(PROJECT_COST_CATEGORIES as readonly string[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {COST_CATEGORY_LABELS[cat] ?? cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                className="h-9"
                placeholder="e.g. Red camera rental"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input
                className="h-9"
                type="number"
                min={0}
                step="any"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                className="h-9"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
          </div>
          <Button
            className="w-full gap-1"
            size="sm"
            onClick={handleAdd}
            disabled={save.isPending}
          >
            <Plus className="h-4 w-4" />
            {save.isPending ? "Adding…" : "Add cost"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
