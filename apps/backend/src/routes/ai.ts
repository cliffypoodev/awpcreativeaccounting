import { Hono } from "hono";
import { prisma } from "../prisma";
import { requireOrg, errorJson, type AppContext } from "../lib/context";
import { extractContent, isSupported, MAX_FILE_BYTES } from "../lib/extract";
import { generateInvoiceDraft, generateReceiptDraft } from "../lib/ai";
import {
  calculateInvoice,
  PROJECT_COST_CATEGORIES,
  type AiInvoiceDraft,
  type AiReceiptDraft,
} from "../types";

const aiRouter = new Hono<AppContext>();

const addDaysISO = (iso: string, days: number) => {
  const base = new Date(iso.length <= 10 ? iso + "T00:00:00Z" : iso);
  if (isNaN(base.getTime())) return new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
  return new Date(base.getTime() + days * 864e5).toISOString().slice(0, 10);
};

aiRouter.post("/invoice-from-file", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return errorJson(c, "Expected a file upload (multipart/form-data).", "bad_request");
  }

  const file = form.get("file");
  const instruction = String(form.get("instruction") ?? "").slice(0, 4000);

  if (!file || typeof file === "string") {
    return errorJson(c, "Please attach a file.", "no_file");
  }
  if (file.size === 0) {
    return errorJson(c, "The file is empty.", "empty_file");
  }
  if (file.size > MAX_FILE_BYTES) {
    return errorJson(c, "File is too large (max 12 MB).", "too_large");
  }
  if (!isSupported(file.name, file.type)) {
    return errorJson(
      c,
      "Unsupported file type. Upload a PDF, spreadsheet (XLS/XLSX/CSV), text file, or image.",
      "unsupported_type"
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let content;
  try {
    content = await extractContent(file.name, file.type, bytes);
  } catch {
    return errorJson(c, "Could not read that file. It may be corrupted.", "extract_failed");
  }

  if (content.kind === "text" && content.text.trim().length === 0) {
    return errorJson(
      c,
      "No readable text was found. If this is a scanned PDF, export it as an image and upload that instead.",
      "no_text"
    );
  }

  const clients = await prisma.client.findMany({
    where: { orgId: org.id },
    select: { id: true, name: true },
  });

  const today = new Date().toISOString().slice(0, 10);

  let draft;
  try {
    draft = await generateInvoiceDraft(instruction, content, {
      today,
      defaultCurrency: org.defaultCurrency,
      defaultTaxRate: org.defaultTaxRate,
      defaultPaymentTerms: org.defaultPaymentTerms,
      clientNames: clients.map((c) => c.name),
    });
  } catch (err) {
    return errorJson(c, (err as Error).message || "AI processing failed.", "ai_failed", 502);
  }

  // Match the AI's client name to an existing client (case-insensitive).
  const wanted = (draft.clientName ?? "").trim().toLowerCase();
  const matched = wanted
    ? clients.find((c) => c.name.trim().toLowerCase() === wanted) ?? null
    : null;

  // Sanitize numbers and dates.
  const items = draft.items
    .filter((it) => it.description?.trim())
    .map((it) => ({
      description: it.description.trim(),
      quantity: Number.isFinite(it.quantity) && it.quantity > 0 ? it.quantity : 1,
      unitPrice: Number.isFinite(it.unitPrice) ? it.unitPrice : 0,
      taxRate: Number.isFinite(it.taxRate) && it.taxRate >= 0 ? it.taxRate : 0,
    }));

  const issueDate = /^\d{4}-\d{2}-\d{2}$/.test(draft.issueDate) ? draft.issueDate : today;
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate)
    ? draft.dueDate
    : addDaysISO(issueDate, org.defaultPaymentTerms);

  const discounts =
    draft.discountPercent && draft.discountPercent > 0
      ? [{ type: "percentage" as const, value: draft.discountPercent }]
      : [];

  const totals = calculateInvoice(items, discounts, []);

  const response: AiInvoiceDraft = {
    matchedClientId: matched?.id ?? null,
    client: {
      name: draft.clientName,
      email: draft.clientEmail,
      company: draft.clientCompany,
    },
    currency: (draft.currency || org.defaultCurrency).slice(0, 3).toUpperCase(),
    issueDate,
    dueDate,
    notes: draft.notes,
    discountPercent: draft.discountPercent,
    items,
    summary: draft.summary,
    totals,
  };

  return c.json({ data: response });
});

// POST /api/ai/receipt-from-file — extract a receipt into a reviewable cost draft
aiRouter.post("/receipt-from-file", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return errorJson(c, "Expected a file upload (multipart/form-data).", "bad_request");
  }

  const file = form.get("file");
  const instruction = String(form.get("instruction") ?? "").slice(0, 4000);

  if (!file || typeof file === "string") {
    return errorJson(c, "Please attach a receipt.", "no_file");
  }
  if (file.size === 0) {
    return errorJson(c, "The file is empty.", "empty_file");
  }
  if (file.size > MAX_FILE_BYTES) {
    return errorJson(c, "File is too large (max 12 MB).", "too_large");
  }
  if (!isSupported(file.name, file.type)) {
    return errorJson(
      c,
      "Unsupported file type. Upload a PDF, spreadsheet (XLS/XLSX/CSV), text file, or image.",
      "unsupported_type"
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let content;
  try {
    content = await extractContent(file.name, file.type, bytes);
  } catch {
    return errorJson(c, "Could not read that file. It may be corrupted.", "extract_failed");
  }

  if (content.kind === "text" && content.text.trim().length === 0) {
    return errorJson(
      c,
      "No readable text was found. If this is a scanned PDF, export it as an image and upload that instead.",
      "no_text"
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  let draft;
  try {
    draft = await generateReceiptDraft(instruction, content, {
      today,
      defaultCurrency: org.defaultCurrency,
      categories: PROJECT_COST_CATEGORIES,
    });
  } catch (err) {
    return errorJson(c, (err as Error).message || "AI processing failed.", "ai_failed", 502);
  }

  // Normalize: clamp category to the allowed list, sanitize amount + date.
  const category = (PROJECT_COST_CATEGORIES as readonly string[]).includes(draft.suggestedCategory)
    ? draft.suggestedCategory
    : "misc";

  const amount =
    typeof draft.amount === "number" && Number.isFinite(draft.amount) && draft.amount > 0
      ? Math.round(draft.amount * 100) / 100
      : null;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(draft.date) ? draft.date : today;

  const response: AiReceiptDraft = {
    vendor: draft.vendor?.trim() || null,
    amount,
    date,
    suggestedCategory: category,
    description: draft.description?.trim() || null,
    currency: (draft.currency || org.defaultCurrency).slice(0, 3).toUpperCase(),
    summary: draft.summary,
  };

  return c.json({ data: response });
});

export { aiRouter };
