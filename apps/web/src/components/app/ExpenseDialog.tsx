import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveExpense, useClients } from "@/lib/queries";
import { EXPENSE_CATEGORIES, type ExpenseRow } from "@/lib/shared";
import { todayISO, errMsg } from "@/lib/format";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseRow | null;
}

const NO_CLIENT = "__none__";

export function ExpenseDialog({ open, onOpenChange, expense }: Props) {
  const save = useSaveExpense();
  const { data: clients } = useClients();

  const [form, setForm] = useState({
    vendor: "",
    category: EXPENSE_CATEGORIES[0] as string,
    description: "",
    amount: "",
    date: todayISO(),
    clientId: "",
    taxDeductible: false,
  });

  useEffect(() => {
    if (open) {
      setForm(
        expense
          ? {
              vendor: expense.vendor ?? "",
              category: expense.category ?? EXPENSE_CATEGORIES[0],
              description: expense.description ?? "",
              amount: String(expense.amount),
              date: expense.date,
              clientId: expense.clientId ?? "",
              taxDeductible: expense.taxDeductible,
            }
          : {
              vendor: "",
              category: EXPENSE_CATEGORIES[0],
              description: "",
              amount: "",
              date: todayISO(),
              clientId: "",
              taxDeductible: false,
            }
      );
    }
  }, [open, expense]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    save.mutate(
      {
        id: expense?.id,
        input: {
          vendor: form.vendor || null,
          category: form.category || null,
          description: form.description || null,
          amount,
          currency: "USD",
          date: form.date,
          taxDeductible: form.taxDeductible,
          clientId: form.clientId || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(expense ? "Expense updated." : "Expense added.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(errMsg(err)),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {expense ? "Edit expense" : "New expense"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="e-vendor">Vendor</Label>
              <Input
                id="e-vendor"
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                placeholder="e.g. Figma"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-amount">Amount *</Label>
              <Input
                id="e-amount"
                type="number"
                min={0}
                step="any"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-date">Date</Label>
              <Input
                id="e-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Linked client (optional)</Label>
            <Select
              value={form.clientId || NO_CLIENT}
              onValueChange={(v) => setForm((f) => ({ ...f, clientId: v === NO_CLIENT ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="No client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CLIENT}>No client</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-desc">Description</Label>
            <Input
              id="e-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="e-deductible" className="cursor-pointer">
                Tax deductible
              </Label>
              <p className="text-xs text-muted-foreground">Count toward deductions</p>
            </div>
            <Switch
              id="e-deductible"
              checked={form.taxDeductible}
              onCheckedChange={(v) => setForm((f) => ({ ...f, taxDeductible: v }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : expense ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
