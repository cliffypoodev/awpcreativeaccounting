/**
 * InvoiceForge — PDF template contract.
 *
 * Templates are plain React components that render to semantic HTML. The worker
 * renders the chosen component to an HTML string and pipes it through Gotenberg
 * (HTML -> PDF). Keeping them as HTML (not react-pdf primitives) means the same
 * components can also drive the on-screen invoice preview.
 *
 * The blueprint lists 10 templates. Two are fully implemented here (Classic,
 * Modern); the remaining eight are registered as aliases onto the closest
 * implemented base so every PDF_TEMPLATES id resolves to something real, and
 * can be specialised later.
 */
import type { ComponentType } from 'react';

export interface PdfLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

export interface PdfInvoiceData {
  orgName: string;
  orgEmail?: string;
  brandColor?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  clientName: string;
  clientEmail?: string;
  items: PdfLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountDue: number;
  notes?: string;
  terms?: string;
}

export type PdfTemplate = ComponentType<{ data: PdfInvoiceData }>;
