/**
 * InvoiceForge — PDF template registry.
 *
 * Every id in shared's PDF_TEMPLATES resolves here. Two base designs are fully
 * implemented (Classic, Modern); the other eight alias to the closest base for
 * now so the picker never points at a missing template. Specialise them by
 * swapping the alias for a dedicated component later.
 */
import { ClassicTemplate } from './classic.js';
import { ModernTemplate } from './modern.js';
import type { PdfInvoiceData, PdfTemplate } from './types.js';

export { ClassicTemplate } from './classic.js';
export { ModernTemplate } from './modern.js';
export type { PdfInvoiceData, PdfLineItem, PdfTemplate } from './types.js';

export const TEMPLATES: Record<string, PdfTemplate> = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  // aliases — closest base until specialised
  professional: ClassicTemplate,
  legal: ClassicTemplate,
  medical: ClassicTemplate,
  consulting: ClassicTemplate,
  contractor: ModernTemplate,
  creative: ModernTemplate,
  retail: ModernTemplate,
  minimal: ModernTemplate,
};

export function getTemplate(id: string | null | undefined): PdfTemplate {
  return (id && TEMPLATES[id]) || ClassicTemplate;
}

export type { PdfInvoiceData as InvoiceData };
