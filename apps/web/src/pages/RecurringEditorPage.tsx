import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
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
import { useRecurringSchedule, useSaveRecurring, useClients, useProjects, useOrg } from "@/lib/queries";
import { calculateInvoice, COMMON_CURRENCIES, RECURRING_FREQUENCIES, RECURRING_STATUSES } from "@/lib/shared";
import type { RecurringInput } from "@/lib/shared";
import { money, todayISO, errMsg } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EditorItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface Draft {
  name: string;
  clientId: string;
  projectId: string;
  status: string;
  frequency: string;
  nextDate: string;
  endDate: string;
  currency: string;
  totalPrepaid: number;
  notes: string;
  items: EditorItem[];
}

const NO_CLIENT = "__none__";
const NO_PROJECT = "__none__";

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
};

function defaultDraft(defaultCurrency: string, defaultTaxRate: number): Draft {
  return {
    name: "",
    clientId: "",
    projectId: "",
    status: "active",
    frequency: "monthly",
    nextDate: todayISO(),
    endDate: "",
    currency: defaultCurrency,
    totalPrepaid: 0,
    notes: "",
    items: [{ description: "", quantity: 1, unitPrice: 0, taxRate: defaultTaxRate }],
  };
}

export default function RecurringEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: existing, isLoading } = useRecurringSchedule(id);
  const { data: org } = useOrg();
  const { data: clients } = useClients();
  const { data: projects } = useProjects();
  const save = useSaveRecurring();

  const initialDraft = useMemo<Draft>(() => {
    if (existing) {
      return {
        name: existing.name,
        clientId: existing.clientId ?? "",
        projectId: existing.projectId ?? "",
        status: existing.status,
        frequency: existing.frequency,
        nextDate: existing.nextDate,
        endDate: existing.endDate ?? "",
        currency: existing.currency,
        totalPrepaid: existing.totalPrepaid,
        notes: existing.notes ?? "",
        items: existing.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate,
        })),
      };
    }
    return defaultDraft(org?.defaultCurrency ?? "USD", org?.defaultTaxRate ?? 0);
  }, [existing, org]);

  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");

  // Once existing data loads, sync it into the draft (only once)
  if (existing && !initialized) {
    setDraft(initialDraft);
    setInitialized(true);
  }
  if (!isEdit && !initialized && org) {
    setDraft(defaultDraft(org.defaultCurrency, org.defaultTaxRate ?? 0));
    setInitialized(true);
  }

  const totals = useMemo(
    () => calculateInvoice(draft.items, [], []),
    [draft.items]
  );

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const updateItem = (i: number, p: Partial<EditorItem>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it, idx) => (idx === i ? { ...it, ...p } : it)),
    }));

  const addItem = () =>
    setDraft((d) => ({
      ...d,
      items: [...d.items, { description: "", quantity: 1, unitPrice: 0, taxRate: 0 }],
    }));

  const removeItem = (i: number) =>
    setDraft((d) => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }));

  const handleSave = () => {
    setError("");
    if (!draft.name.trim()) {
      setError("Schedule name is required.");
      return;
    }
    if (!draft.nextDate) {
      setError("Next billing date is required.");
      return;
    }
    const validItems = draft.items.filter((it) => it.description.trim().length > 0);
    if (validItems.length === 0) {
      setError("Add at least one line item with a description.");
      return;
    }

    const input: RecurringInput = {
      name: draft.name.trim(),
      clientId: draft.clientId || null,
      projectId: draft.projectId || null,
      status: draft.status as RecurringInput["status"],
      frequency: draft.frequency as RecurringInput["frequency"],
      nextDate: draft.nextDate,
      endDate: draft.endDate || null,
      currency: draft.currency,
      totalPrepaid: Math.max(0, Math.floor(Number(draft.totalPrepaid) || 0)),
      notes: draft.notes || null,
      items: validItems.map((it, idx) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        taxRate: Number(it.taxRate) || 0,
        sortOrder: idx,
      })),
    };

    save.mutate(
      { id, input },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Schedule updated." : "Schedule created.");
          navigate("/app/recurring");
        },
        onError: (err) => {
          toast.error(errMsg(err));
        },
      }
    );
  };

  if (isEdit && isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-secondary/60" />;
  }

  const symbol = COMMON_CURRENCIES.find((c) => c.code === draft.currency)?.symbol ?? "$";

  return (
    <div>
      <button
        onClick={() => navigate("/app/recurring")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to recurring
      </button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {isEdit ? "Edit schedule" : "New recurring schedule"}
        </h1>
        <Button onClick={handleSave} disabled={save.isPending} className="gap-1">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {save.isPending ? "Saving…" : "Save schedule"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Schedule details */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-display text-lg font-semibold">Schedule details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Schedule name</Label>
                <Input
                  placeholder="e.g. Monthly retainer — Acme Corp"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={draft.clientId || NO_CLIENT}
                  onValueChange={(v) => patch({ clientId: v === NO_CLIENT ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLIENT}>No client</SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.company ? ` · ${c.company}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select
                  value={draft.projectId || NO_PROJECT}
                  onValueChange={(v) => patch({ projectId: v === NO_PROJECT ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PROJECT}>No project</SelectItem>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.referenceCode ? ` · ${p.referenceCode}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={draft.frequency}
                  onValueChange={(v) => patch({ frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRING_FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {FREQ_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) => patch({ status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRING_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Next billing date</Label>
                <Input
                  type="date"
                  value={draft.nextDate}
                  onChange={(e) => patch({ nextDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>End date (optional)</Label>
                <Input
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => patch({ endDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={draft.currency} onValueChange={(v) => patch({ currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prepaid units</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0 = unlimited"
                  value={draft.totalPrepaid || ""}
                  onChange={(e) =>
                    patch({ totalPrepaid: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  For retainers: number of invoices included. Leave 0 for unlimited.
                </p>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Line items</h2>
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-4 w-4" /> Add item
              </Button>
            </div>

            <div className="hidden grid-cols-12 gap-2 px-2 pb-2 text-xs font-medium text-muted-foreground sm:grid">
              <span className="col-span-5">Description</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-2 text-right">Unit price</span>
              <span className="col-span-1 text-right">Tax %</span>
              <span className="col-span-2 text-right">Amount</span>
            </div>

            <div className="space-y-2">
              {draft.items.map((it, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 items-center gap-2 rounded-lg border border-border/70 p-2 sm:grid-cols-12 sm:border-0 sm:p-0"
                >
                  <div className="col-span-2 flex items-center gap-1 sm:col-span-5">
                    <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground/40 sm:block" />
                    <Input
                      placeholder="Description of service"
                      value={it.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground sm:hidden">Qty</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="text-right"
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(i, { quantity: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground sm:hidden">Unit price</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="text-right"
                      value={it.unitPrice}
                      onChange={(e) =>
                        updateItem(i, { unitPrice: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground sm:hidden">Tax %</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="text-right"
                      value={it.taxRate}
                      onChange={(e) =>
                        updateItem(i, { taxRate: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-2">
                    <span className="text-sm font-medium tabular-nums">
                      {money(
                        (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
                        draft.currency
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {draft.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No items yet. Add your first line.
                </p>
              ) : null}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (internal)</Label>
            <Textarea
              rows={3}
              placeholder="Internal notes about this schedule…"
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Per-cycle total</h2>

            <div className="space-y-2 text-sm">
              <SummaryRow label="Subtotal" value={money(totals.subtotal, draft.currency)} />
              {totals.taxAmount > 0 ? (
                <SummaryRow label="Tax" value={money(totals.taxAmount, draft.currency)} />
              ) : null}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-semibold">Total</span>
                  <span className="font-display text-xl font-semibold tabular-nums text-amber">
                    {money(totals.total, draft.currency)}
                  </span>
                </div>
              </div>
            </div>

            {draft.frequency ? (
              <p className="text-xs text-muted-foreground">
                {FREQ_LABELS[draft.frequency]} · {symbol}{" "}
                {totals.total.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                per cycle
              </p>
            ) : null}

            {draft.totalPrepaid > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
                Retainer: {draft.totalPrepaid} invoice
                {draft.totalPrepaid === 1 ? "" : "s"} prepaid. Schedule will
                auto-cancel after all units are used.
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button onClick={handleSave} disabled={save.isPending} className="w-full gap-1">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {save.isPending ? "Saving…" : "Save schedule"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums")}>{value}</span>
    </div>
  );
}
