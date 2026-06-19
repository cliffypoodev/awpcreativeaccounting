/**
 * InvoiceForge — Invoice Calculation Engine
 *
 * Deterministic money math. All amounts are treated as currency-major units
 * (e.g. dollars) and rounded to 2 decimal places at every boundary to avoid
 * floating-point drift accumulating across line items.
 *
 * Calculation order (matches blueprint §5 Invoice Generator):
 *   subtotal -> tax -> discounts -> deposits -> amount_due
 */

/** Round to 2 decimal places (banker-safe enough for invoice totals). */
export const round = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface CalcLineItem {
  quantity: number;
  unitPrice: number;
  /** Per-line tax rate as a percentage, e.g. 8.5 for 8.5%. */
  taxRate: number;
}

export type DiscountType = 'percentage' | 'fixed';

export interface CalcDiscount {
  type: DiscountType;
  /** For 'percentage' this is a percent (10 = 10%); for 'fixed' it is a money amount. */
  value: number;
}

export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  depositsTotal: number;
  total: number;
  amountDue: number;
}

/**
 * Calculate full invoice totals.
 *
 * Faithful to the blueprint appendix engine, hardened for edge cases:
 *  - negative / NaN inputs are coerced to 0
 *  - discounts never push the total below 0
 *  - amountDue never goes negative (overpayment clamps to 0)
 */
export function calculateInvoice(
  items: CalcLineItem[],
  discounts: CalcDiscount[] = [],
  deposits: number[] = [],
): InvoiceTotals {
  const safe = (n: number): number => (Number.isFinite(n) ? n : 0);

  const subtotal = round(
    items.reduce((sum, item) => sum + round(safe(item.quantity) * safe(item.unitPrice)), 0),
  );

  const taxAmount = round(
    items.reduce(
      (sum, item) =>
        sum + round(safe(item.quantity) * safe(item.unitPrice) * (safe(item.taxRate) / 100)),
      0,
    ),
  );

  const discountAmount = round(
    discounts.reduce((sum, d) => {
      if (d.type === 'percentage') return sum + round(subtotal * (safe(d.value) / 100));
      return sum + safe(d.value);
    }, 0),
  );

  const depositsTotal = round(deposits.reduce((sum, d) => sum + safe(d), 0));

  // Discounts apply to subtotal+tax; never let the bill go negative.
  const total = Math.max(0, round(subtotal + taxAmount - discountAmount));

  // Deposits/partial payments reduce what's owed; clamp at 0.
  const amountDue = Math.max(0, round(total - depositsTotal));

  return { subtotal, taxAmount, discountAmount, depositsTotal, total, amountDue };
}

/** Convenience: compute a single line item's pre-tax amount. */
export function lineAmount(quantity: number, unitPrice: number): number {
  return round((Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0));
}

/** Map a numeric status to a human label used across UI + PDFs. */
export function paymentProgress(total: number, amountPaid: number): number {
  if (total <= 0) return 0;
  return Math.min(100, round((amountPaid / total) * 100));
}
