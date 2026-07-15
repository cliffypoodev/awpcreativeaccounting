import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, GripVertical, ArrowLeft, Loader2 } from "lucide-react";
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
import { useClients } from "@/lib/queries";
import { calculateInvoice, COMMON_CURRENCIES, type InvoiceInput, type EstimateInput } from "@/lib/shared";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface EditorItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}
export interface EditorDiscount {
  type: "percentage" | "fixed";
  value: number;
}
export interface EditorDeposit {
  description: string;
  amount: number;
}

export interface DocumentDraft {
  clientId: string;
  number: string;
  issueDate: string;
  secondDate: string; // dueDate (invoice) or expiryDate (estimate)
  currency: string;
  items: EditorItem[];
  discounts: EditorDiscount[];
  deposits: EditorDeposit[];
  notes: string;
  terms: string;
}

interface Props {
  kind: "invoice" | "estimate";
  initial: DocumentDraft;
  saving: boolean;
  onSave: (input: InvoiceInput | EstimateInput) => void;
  backTo: string;
  title: string;
  notice?: React.ReactNode;
}

const NO_CLIENT = "__none__";

export function DocumentEditor({ kind, initial, saving, onSave, backTo, title, notice }: Props) {
  const navigate = useNavigate();
  const { data: clients } = useClients();
  const [draft, setDraft] = useState<DocumentDraft>(initial);
  const [error, setError] = useState("");

  const totals = useMemo(
    () =>
      calculateInvoice(
        draft.items,
        draft.discounts,
        kind === "invoice" ? draft.deposits.map((d) => d.amount) : []
      ),
    [draft.items, draft.discounts, draft.deposits, kind]
  );

  const patch = (p: Partial<DocumentDraft>) => setDraft((d) => ({ ...d, ...p }));

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

  const addDiscount = () =>
    setDraft((d) => ({ ...d, discounts: [...d.discounts, { type: "percentage", value: 0 }] }));
  const updateDiscount = (i: number, p: Partial<EditorDiscount>) =>
    setDraft((d) => ({
      ...d,
      discounts: d.discounts.map((dc, idx) => (idx === i ? { ...dc, ...p } : dc)),
    }));
  const removeDiscount = (i: number) =>
    setDraft((d) => ({ ...d, discounts: d.discounts.filter((_, idx) => idx !== i) }));

  const addDeposit = () =>
    setDraft((d) => ({ ...d, deposits: [...d.deposits, { description: "Deposit", amount: 0 }] }));
  const updateDeposit = (i: number, p: Partial<EditorDeposit>) =>
    setDraft((d) => ({
      ...d,
      deposits: d.deposits.map((dp, idx) => (idx === i ? { ...dp, ...p } : dp)),
    }));
  const removeDeposit = (i: number) =>
    setDraft((d) => ({ ...d, deposits: d.deposits.filter((_, idx) => idx !== i) }));

  const handleSave = () => {
    setError("");
    const validItems = draft.items.filter((it) => it.description.trim().length > 0);
    if (validItems.length === 0) {
      setError("Add at least one line item with a description.");
      return;
    }
    const base = {
      clientId: draft.clientId || null,
      number: draft.number.trim() || undefined,
      issueDate: draft.issueDate,
      currency: draft.currency,
      items: validItems.map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        taxRate: Number(it.taxRate) || 0,
      })),
      discounts: draft.discounts.map((d) => ({ type: d.type, value: Number(d.value) || 0 })),
      notes: draft.notes || null,
      terms: draft.terms || null,
    };
    if (kind === "invoice") {
      onSave({
        ...base,
        status: "draft",
        dueDate: draft.secondDate,
        deposits: draft.deposits.map((d) => ({ description: d.description, amount: Number(d.amount) || 0 })),
      } as InvoiceInput);
    } else {
      onSave({
        ...base,
        status: "draft",
        expiryDate: draft.secondDate || null,
      } as EstimateInput);
    }
  };

  const symbol = COMMON_CURRENCIES.find((c) => c.code === draft.currency)?.symbol ?? "$";

  return (
    <div>
      <button
        onClick={() => navigate(backTo)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <Button onClick={handleSave} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving…" : `Save ${kind}`}
        </Button>
      </div>

      {notice ? <div className="mb-6">{notice}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Header fields */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label>{kind === "invoice" ? "Issue date" : "Issue date"}</Label>
                <Input
                  type="date"
                  value={draft.issueDate}
                  onChange={(e) => patch({ issueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{kind === "invoice" ? "Due date" : "Valid until"}</Label>
                <Input
                  type="date"
                  value={draft.secondDate}
                  onChange={(e) => patch({ secondDate: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{kind === "invoice" ? "Invoice number" : "Estimate number"} (optional)</Label>
                <Input
                  placeholder={kind === "invoice" ? "Auto · INV-0001" : "Auto · EST-0001"}
                  value={draft.number}
                  onChange={(e) => patch({ number: e.target.value })}
                />
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

            {/* Column headers (desktop) */}
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
                      placeholder="Description of work"
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
                      onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })}
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
                      onChange={(e) => updateItem(i, { unitPrice: parseFloat(e.target.value) || 0 })}
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
                      onChange={(e) => updateItem(i, { taxRate: parseFloat(e.target.value) || 0 })}
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

          {/* Notes & terms */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                placeholder="Visible to your client"
                value={draft.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Terms</Label>
              <Textarea
                rows={3}
                placeholder="Payment terms, late fees…"
                value={draft.terms}
                onChange={(e) => patch({ terms: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Totals sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Summary</h2>

            <div className="space-y-2 text-sm">
              <Row label="Subtotal" value={money(totals.subtotal, draft.currency)} />
              <Row label="Tax" value={money(totals.taxAmount, draft.currency)} />

              {/* Discounts */}
              <div className="border-t border-border pt-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Discounts</span>
                  <button onClick={addDiscount} className="text-xs font-medium text-primary hover:underline">
                    + Add
                  </button>
                </div>
                {draft.discounts.map((d, i) => (
                  <div key={i} className="mb-1.5 flex items-center gap-1.5">
                    <Select
                      value={d.type}
                      onValueChange={(v) => updateDiscount(i, { type: v as "percentage" | "fixed" })}
                    >
                      <SelectTrigger className="h-8 w-[88px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">{symbol}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="h-8 text-right text-xs"
                      value={d.value}
                      onChange={(e) => updateDiscount(i, { value: parseFloat(e.target.value) || 0 })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeDiscount(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {totals.discountAmount > 0 ? (
                  <Row
                    label="Discount total"
                    value={`− ${money(totals.discountAmount, draft.currency)}`}
                    valueClass="text-emerald-600"
                  />
                ) : null}
              </div>

              {/* Deposits (invoice only) */}
              {kind === "invoice" ? (
                <div className="border-t border-border pt-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Deposits / payments
                    </span>
                    <button onClick={addDeposit} className="text-xs font-medium text-primary hover:underline">
                      + Add
                    </button>
                  </div>
                  {draft.deposits.map((dp, i) => (
                    <div key={i} className="mb-1.5 flex items-center gap-1.5">
                      <Input
                        className="h-8 text-xs"
                        placeholder="Label"
                        value={dp.description}
                        onChange={(e) => updateDeposit(i, { description: e.target.value })}
                      />
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="h-8 w-24 text-right text-xs"
                        value={dp.amount}
                        onChange={(e) => updateDeposit(i, { amount: parseFloat(e.target.value) || 0 })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeDeposit(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {totals.depositsTotal > 0 ? (
                    <Row
                      label="Paid so far"
                      value={`− ${money(totals.depositsTotal, draft.currency)}`}
                      valueClass="text-emerald-600"
                    />
                  ) : null}
                </div>
              ) : null}

              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-semibold">
                    {kind === "invoice" ? "Amount due" : "Total"}
                  </span>
                  <span className="font-display text-xl font-semibold tabular-nums text-amber">
                    {money(kind === "invoice" ? totals.amountDue : totals.total, draft.currency)}
                  </span>
                </div>
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button onClick={handleSave} disabled={saving} className="w-full gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : `Save ${kind}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", valueClass)}>{value}</span>
    </div>
  );
}
