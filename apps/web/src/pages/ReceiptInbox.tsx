import { useRef, useState } from "react";
import {
  Sparkles,
  Upload,
  FileText,
  Loader2,
  X,
  Receipt as ReceiptIcon,
  Check,
} from "lucide-react";
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
import { PageHeader, EmptyState, TableSkeleton } from "@/components/app/ui-bits";
import { useProjects, useCosts, useFileReceiptCost } from "@/lib/queries";
import {
  PROJECT_COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  COMMON_CURRENCIES,
  type AiReceiptDraft,
  type ProjectCostInput,
} from "@/lib/shared";
import { money, shortDate, errMsg, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.xls,.xlsx,.csv,.txt,.tsv,.json,.md,.png,.jpg,.jpeg,.webp,.gif,image/*";
const MAX_BYTES = 12 * 1024 * 1024;

interface ReviewState {
  vendor: string;
  amount: string;
  date: string;
  category: string;
  currency: string;
  description: string;
  projectId: string;
  summary: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  gear_rental: "bg-blue-100 text-blue-700 border-blue-200",
  talent_fees: "bg-purple-100 text-purple-700 border-purple-200",
  contractor_hours: "bg-amber-100 text-amber-700 border-amber-200",
  insurance: "bg-emerald-100 text-emerald-700 border-emerald-200",
  misc: "bg-stone-100 text-stone-600 border-stone-200",
};

export default function ReceiptInbox() {
  const { data: projects } = useProjects();
  const { data: costs, isLoading: costsLoading } = useCosts();
  const fileCost = useFileReceiptCost();

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [instruction, setInstruction] = useState("");
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("File is too large (max 12 MB).");
      return;
    }
    setFile(f);
  };

  const resetUpload = () => {
    setFile(null);
    setInstruction("");
  };

  const parse = async () => {
    if (!file) {
      toast.error("Attach a receipt first.");
      return;
    }
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("instruction", instruction);
      const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
      const res = await fetch(`${baseUrl}/api/ai/receipt-from-file`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || `Request failed (${res.status})`);
      const draft = json.data as AiReceiptDraft;
      setReview({
        vendor: draft.vendor ?? "",
        amount: draft.amount != null ? String(draft.amount) : "",
        date: draft.date || todayISO(),
        category: draft.suggestedCategory || "misc",
        currency: draft.currency || "USD",
        description: draft.description ?? "",
        projectId: "",
        summary: draft.summary,
      });
      resetUpload();
      toast.success("Receipt scanned — review and file it.");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setParsing(false);
    }
  };

  const setR = <K extends keyof ReviewState>(k: K, v: ReviewState[K]) =>
    setReview((r) => (r ? { ...r, [k]: v } : r));

  const fileReceipt = () => {
    if (!review) return;
    if (!review.projectId) {
      toast.error("Choose which project this cost belongs to.");
      return;
    }
    const amt = parseFloat(review.amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    const vendorPrefix = review.vendor.trim() ? `${review.vendor.trim()} — ` : "";
    const description = (vendorPrefix + review.description.trim()).trim().slice(0, 255) || null;
    const input: ProjectCostInput = {
      projectId: review.projectId,
      category: review.category as ProjectCostInput["category"],
      description,
      amount: Math.round(amt * 100) / 100,
      currency: review.currency,
      date: review.date,
      notes: null,
    };
    fileCost.mutate(
      { projectId: review.projectId, input },
      {
        onSuccess: () => {
          toast.success("Filed to project costs — it now feeds profitability.");
          setReview(null);
        },
        onError: (err) => toast.error(errMsg(err)),
      }
    );
  };

  return (
    <div>
      <PageHeader
        title="Receipt inbox"
        subtitle="Drop a receipt, let AI read the vendor, amount, and date, then file it to a project as a cost."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: upload / review */}
        <div className="lg:col-span-3">
          {review ? (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" /> Review parsed receipt
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setReview(null)}
                  disabled={fileCost.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {review.summary ? (
                <p className="mb-4 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
                  {review.summary}
                </p>
              ) : null}

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Vendor</Label>
                  <Input
                    className="h-9"
                    placeholder="Who was paid"
                    value={review.vendor}
                    onChange={(e) => setR("vendor", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      className="h-9"
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0.00"
                      value={review.amount}
                      onChange={(e) => setR("amount", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Currency</Label>
                    <Select value={review.currency} onValueChange={(v) => setR("currency", v)}>
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
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input
                      className="h-9"
                      type="date"
                      value={review.date}
                      onChange={(e) => setR("date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={review.category} onValueChange={(v) => setR("category", v)}>
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
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Project</Label>
                  <Select value={review.projectId} onValueChange={(v) => setR("projectId", v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Assign to a project" />
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
                  <Label className="text-xs">Description (optional)</Label>
                  <Textarea
                    rows={2}
                    placeholder="What was purchased"
                    value={review.description}
                    onChange={(e) => setR("description", e.target.value)}
                  />
                </div>

                <Button
                  className="w-full gap-1"
                  onClick={fileReceipt}
                  disabled={fileCost.isPending || !review.projectId}
                >
                  {fileCost.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Filing…
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> File as project cost
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              {file ? (
                <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setFile(null)}
                    disabled={parsing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    pick(e.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    "flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                    dragOver ? "border-primary bg-accent/40" : "border-border hover:border-primary/50"
                  )}
                >
                  <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload or drag a receipt here</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, image, or spreadsheet · up to 12 MB
                  </p>
                </button>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0])}
              />

              <div className="mt-3 space-y-2">
                <Label htmlFor="receipt-instruction" className="text-xs">
                  Anything to note? (optional)
                </Label>
                <Textarea
                  id="receipt-instruction"
                  rows={2}
                  placeholder="e.g. This was a camera rental for the Northwind shoot."
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  disabled={parsing}
                />
              </div>

              <Button onClick={parse} disabled={parsing || !file} className="mt-3 w-full gap-1">
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Reading receipt…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Scan receipt
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Right: recently filed */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recently filed
          </h2>
          {costsLoading ? (
            <TableSkeleton rows={4} />
          ) : (costs ?? []).length === 0 ? (
            <EmptyState
              icon={ReceiptIcon}
              title="Nothing filed yet"
              description="Scanned receipts you file will show up here and in each project's profitability."
            />
          ) : (
            <div className="space-y-2">
              {(costs ?? []).slice(0, 25).map((cost) => (
                <div
                  key={cost.id}
                  className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        CATEGORY_COLORS[cost.category] ?? CATEGORY_COLORS.misc
                      )}
                    >
                      {COST_CATEGORY_LABELS[cost.category] ?? cost.category}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {money(cost.amount, cost.currency)}
                    </span>
                  </div>
                  {cost.description ? (
                    <p className="mt-1.5 truncate text-sm">{cost.description}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">{cost.referenceCode}</span> · {cost.projectName} ·{" "}
                    {shortDate(cost.date)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
