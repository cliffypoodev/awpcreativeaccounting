/**
 * Turn an uploaded file into something the model can read:
 *  - txt / csv / json / md  → decoded text
 *  - xls / xlsx             → each sheet flattened to CSV text
 *  - pdf                    → extracted text (text-based PDFs)
 *  - png / jpg / webp / gif → base64 data URL for the vision model
 *
 * Scanned PDFs (no embedded text) yield empty text; the caller surfaces a
 * helpful message in that case.
 */
import * as XLSX from "xlsx";
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB
const MAX_TEXT_CHARS = 24_000;

export type ExtractResult =
  | { kind: "text"; text: string }
  | { kind: "image"; dataUrl: string };

const ext = (name: string) => name.toLowerCase().split(".").pop() ?? "";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const SHEET_EXT = new Set(["xls", "xlsx", "xlsm", "ods"]);
const TEXT_EXT = new Set(["txt", "csv", "tsv", "json", "md", "text", "log"]);

const clip = (s: string) =>
  s.length > MAX_TEXT_CHARS ? s.slice(0, MAX_TEXT_CHARS) + "\n…[truncated]" : s;

export function isSupported(name: string, mime: string): boolean {
  const e = ext(name);
  if (IMAGE_EXT.has(e) || SHEET_EXT.has(e) || TEXT_EXT.has(e) || e === "pdf") return true;
  return mime.startsWith("text/") || mime.startsWith("image/") || mime === "application/pdf";
}

export async function extractContent(
  name: string,
  mime: string,
  bytes: Uint8Array
): Promise<ExtractResult> {
  const e = ext(name);

  // Images → vision
  if (IMAGE_EXT.has(e) || mime.startsWith("image/")) {
    const b64 = Buffer.from(bytes).toString("base64");
    const type = mime.startsWith("image/") ? mime : `image/${e === "jpg" ? "jpeg" : e}`;
    return { kind: "image", dataUrl: `data:${type};base64,${b64}` };
  }

  // Spreadsheets → CSV text per sheet
  if (SHEET_EXT.has(e)) {
    const wb = XLSX.read(bytes, { type: "array" });
    const parts: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      if (csv.trim()) parts.push(`# Sheet: ${sheetName}\n${csv}`);
    }
    return { kind: "text", text: clip(parts.join("\n\n") || "(empty spreadsheet)") };
  }

  // PDF → embedded text
  if (e === "pdf" || mime === "application/pdf") {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(pdf, { mergePages: true });
      const joined = Array.isArray(text) ? text.join("\n") : text;
      return { kind: "text", text: clip((joined ?? "").trim()) };
    } catch {
      return { kind: "text", text: "" };
    }
  }

  // Plain text / CSV / JSON / etc.
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return { kind: "text", text: clip(text) };
}
