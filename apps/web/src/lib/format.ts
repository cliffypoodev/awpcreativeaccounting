import { currencySymbol } from "./shared";

export const errMsg = (e: unknown): string =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";

export function money(amount: number, currency = "USD"): string {
  const sym = currencySymbol(currency);
  const n = (Number.isFinite(amount) ? amount : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sym}${n}`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days: number): string {
  return new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
}

export function isOverdue(dueDate: string, status: string): boolean {
  if (status === "paid" || status === "cancelled" || status === "draft") return false;
  return dueDate < todayISO();
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  partially_paid: "Partly paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
  approved: "Approved",
  declined: "Declined",
  expired: "Expired",
  converted: "Converted",
};

export const statusLabel = (s: string): string => STATUS_LABELS[s] ?? s;

// Tailwind classes per status badge
export const statusClasses = (s: string): string => {
  switch (s) {
    case "paid":
    case "approved":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "sent":
    case "viewed":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "partially_paid":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "overdue":
    case "declined":
    case "expired":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "converted":
      return "bg-violet-100 text-violet-800 border-violet-200";
    case "cancelled":
      return "bg-stone-200 text-stone-600 border-stone-300";
    default:
      return "bg-stone-100 text-stone-700 border-stone-200";
  }
};
