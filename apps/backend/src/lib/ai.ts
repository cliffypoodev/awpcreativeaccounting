/**
 * AI invoice extraction. Sends the uploaded document's content (text or image)
 * plus the user's instruction to the model and gets back a strictly-typed
 * invoice draft (never persisted directly — the user reviews it first).
 */
import { z } from "zod";
import type { ExtractResult } from "./extract";
import { env } from "../env";

const BASE = env.OPENAI_BASE_URL;
const KEY = env.OPENAI_API_KEY;
const MODEL = env.OPENAI_MODEL;

export interface DraftContext {
  today: string;
  defaultCurrency: string;
  defaultTaxRate: number;
  defaultPaymentTerms: number;
  clientNames: string[];
}

// What we ask the model to return (mirrors our invoice editor draft).
export const aiDraftSchema = z.object({
  clientName: z.string().nullable(),
  clientEmail: z.string().nullable(),
  clientCompany: z.string().nullable(),
  currency: z.string(),
  issueDate: z.string(),
  dueDate: z.string(),
  notes: z.string().nullable(),
  discountPercent: z.number().nullable(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      taxRate: z.number(),
    })
  ),
  summary: z.string(),
});
export type AiDraft = z.infer<typeof aiDraftSchema>;

// JSON Schema handed to the Responses API (strict mode).
const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    clientName: { type: ["string", "null"] },
    clientEmail: { type: ["string", "null"] },
    clientCompany: { type: ["string", "null"] },
    currency: { type: "string", description: "3-letter ISO code, e.g. USD" },
    issueDate: { type: "string", description: "YYYY-MM-DD" },
    dueDate: { type: "string", description: "YYYY-MM-DD" },
    notes: { type: ["string", "null"] },
    discountPercent: {
      type: ["number", "null"],
      description: "Overall percentage discount if one is implied, else null",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unitPrice: { type: "number" },
          taxRate: { type: "number", description: "Percentage, e.g. 8.5; 0 if none" },
        },
        required: ["description", "quantity", "unitPrice", "taxRate"],
      },
    },
    summary: {
      type: "string",
      description: "One sentence describing what was extracted and any assumptions made.",
    },
  },
  required: [
    "clientName",
    "clientEmail",
    "clientCompany",
    "currency",
    "issueDate",
    "dueDate",
    "notes",
    "discountPercent",
    "items",
    "summary",
  ],
} as const;

function systemPrompt(ctx: DraftContext): string {
  return [
    "You are a meticulous billing assistant for AWP Creative.",
    "From the user's instruction and the attached document, produce a single invoice draft.",
    "Rules:",
    "- Extract concrete line items: description, quantity, unit price, and tax rate (percent).",
    "- If the document lists totals/line amounts, derive unit price = amount / quantity.",
    "- Never invent prices that aren't supported by the document or instruction. If a price is genuinely unknown, use 0 and note it in the summary.",
    "- Quantities default to 1 when a single fixed-fee item is described.",
    `- Tax rate defaults to ${ctx.defaultTaxRate} when the document doesn't specify one.`,
    `- Currency defaults to ${ctx.defaultCurrency} unless the document clearly uses another.`,
    `- Today is ${ctx.today}. Use it as issueDate unless the document states one.`,
    `- dueDate defaults to issueDate + ${ctx.defaultPaymentTerms} days unless stated.`,
    "- Identify who is being billed (the client). Prefer matching an existing client name when the document's client clearly corresponds to one:",
    ctx.clientNames.length
      ? `  Existing clients: ${ctx.clientNames.map((n) => `"${n}"`).join(", ")}.`
      : "  (No existing clients yet.)",
    "- Dates must be YYYY-MM-DD. Amounts are plain numbers (no currency symbols).",
    "- Follow the user's instruction when it overrides or clarifies the document.",
  ].join("\n");
}

export async function generateInvoiceDraft(
  instruction: string,
  content: ExtractResult,
  ctx: DraftContext
): Promise<AiDraft> {
  if (!KEY || !BASE) throw new Error("AI is not configured on this server.");

  const userText =
    `Instruction from user:\n${instruction || "(none — infer a reasonable invoice from the document)"}\n\n` +
    (content.kind === "text"
      ? `Document content:\n"""\n${content.text || "(the document contained no readable text)"}\n"""`
      : "The document is attached as an image. Read it carefully.");

  const userContent: unknown[] = [{ type: "input_text", text: userText }];
  if (content.kind === "image") {
    userContent.push({ type: "input_image", image_url: content.dataUrl });
  }

  const res = await fetch(`${BASE}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      input: [
        { role: "system", content: [{ type: "input_text", text: systemPrompt(ctx) }] },
        { role: "user", content: userContent },
      ],
      text: {
        format: { type: "json_schema", name: "invoice_draft", strict: true, schema: jsonSchema },
      },
      max_output_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}). ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    status?: string;
    output?: { type: string; content?: { type: string; text?: string }[] }[];
  };

  if (data.status === "incomplete") {
    throw new Error("The document was too large or complex to process. Try a smaller file.");
  }

  const msg = (data.output ?? []).find((o) => o.type === "message");
  const text = msg?.content?.find((c) => c.type === "output_text")?.text;
  if (!text) throw new Error("The AI did not return a usable draft. Please try again.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The AI returned an unreadable response. Please try again.");
  }
  return aiDraftSchema.parse(parsed);
}

// ─── Phase 4: Receipt extraction → project cost ───────────────────

export interface ReceiptContext {
  today: string;
  defaultCurrency: string;
  /** Allowed project-cost categories the model must choose from. */
  categories: readonly string[];
}

export const aiReceiptSchema = z.object({
  vendor: z.string().nullable(),
  amount: z.number().nullable(),
  date: z.string(),
  suggestedCategory: z.string(),
  description: z.string().nullable(),
  currency: z.string(),
  summary: z.string(),
});
export type AiReceipt = z.infer<typeof aiReceiptSchema>;

const receiptJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    vendor: { type: ["string", "null"], description: "Merchant / supplier name on the receipt" },
    amount: {
      type: ["number", "null"],
      description: "Grand total paid as a plain number, no currency symbol. null if unknown.",
    },
    date: { type: "string", description: "YYYY-MM-DD; the transaction date" },
    suggestedCategory: {
      type: "string",
      description: "Best-fit project-cost category from the allowed list.",
    },
    description: {
      type: ["string", "null"],
      description: "Short note of what was purchased (e.g. 'Red camera rental, 2 days').",
    },
    currency: { type: "string", description: "3-letter ISO code, e.g. USD" },
    summary: {
      type: "string",
      description: "One sentence describing what was extracted and any assumptions made.",
    },
  },
  required: ["vendor", "amount", "date", "suggestedCategory", "description", "currency", "summary"],
} as const;

function receiptSystemPrompt(ctx: ReceiptContext): string {
  return [
    "You are a meticulous bookkeeping assistant for AWP Creative, a video/audio production studio.",
    "From the user's instruction and the attached receipt, extract a single expense to be filed as a project cost.",
    "Rules:",
    "- Identify the vendor/merchant, the grand TOTAL amount actually paid, and the transaction date.",
    "- amount is a plain number with no currency symbol. If the total is genuinely unreadable, use null.",
    `- Choose suggestedCategory as the single best fit from this allowed list ONLY: ${ctx.categories.join(", ")}.`,
    "  Map common items: equipment/camera/lighting rental → gear_rental; actor/voice/talent payments → talent_fees;",
    "  freelancer/editor/contractor labor → contractor_hours; production/liability insurance → insurance; anything else → misc.",
    `- date must be YYYY-MM-DD. Today is ${ctx.today}; use it only if the receipt has no readable date.`,
    `- currency defaults to ${ctx.defaultCurrency} unless the receipt clearly uses another.`,
    "- Never invent an amount that isn't supported by the receipt.",
    "- Follow the user's instruction when it clarifies or overrides the receipt.",
  ].join("\n");
}

export async function generateReceiptDraft(
  instruction: string,
  content: ExtractResult,
  ctx: ReceiptContext
): Promise<AiReceipt> {
  if (!KEY || !BASE) throw new Error("AI is not configured on this server.");

  const userText =
    `Instruction from user:\n${instruction || "(none — extract the expense from the receipt)"}\n\n` +
    (content.kind === "text"
      ? `Receipt content:\n"""\n${content.text || "(the document contained no readable text)"}\n"""`
      : "The receipt is attached as an image. Read it carefully.");

  const userContent: unknown[] = [{ type: "input_text", text: userText }];
  if (content.kind === "image") {
    userContent.push({ type: "input_image", image_url: content.dataUrl });
  }

  const res = await fetch(`${BASE}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      input: [
        { role: "system", content: [{ type: "input_text", text: receiptSystemPrompt(ctx) }] },
        { role: "user", content: userContent },
      ],
      text: {
        format: { type: "json_schema", name: "receipt_draft", strict: true, schema: receiptJsonSchema },
      },
      max_output_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}). ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    status?: string;
    output?: { type: string; content?: { type: string; text?: string }[] }[];
  };

  if (data.status === "incomplete") {
    throw new Error("The receipt was too large or complex to process. Try a smaller file.");
  }

  const msg = (data.output ?? []).find((o) => o.type === "message");
  const text = msg?.content?.find((c) => c.type === "output_text")?.text;
  if (!text) throw new Error("The AI did not return a usable result. Please try again.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The AI returned an unreadable response. Please try again.");
  }
  return aiReceiptSchema.parse(parsed);
}
