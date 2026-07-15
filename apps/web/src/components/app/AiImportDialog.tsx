import { useRef, useState } from "react";
import { Sparkles, Upload, FileText, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { errMsg } from "@/lib/format";
import type { AiInvoiceDraft } from "@/lib/shared";
import { toast } from "sonner";

const ACCEPT = ".pdf,.xls,.xlsx,.csv,.txt,.tsv,.json,.md,.png,.jpg,.jpeg,.webp,.gif,image/*";
const MAX_BYTES = 12 * 1024 * 1024;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDraft: (draft: AiInvoiceDraft) => void;
}

export function AiImportDialog({ open, onOpenChange, onDraft }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setFile(null);
    setInstruction("");
    setLoading(false);
  };

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("File is too large (max 12 MB).");
      return;
    }
    setFile(f);
  };

  const generate = async () => {
    if (!file) {
      toast.error("Attach a file first.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("instruction", instruction);
      const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
      const res = await fetch(`${baseUrl}/api/ai/invoice-from-file`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message || `Request failed (${res.status})`);
      }
      onDraft(json.data as AiInvoiceDraft);
      toast.success("Draft ready — review and save.");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) {
          if (!o) reset();
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="h-5 w-5 text-primary" /> Import with AI
          </DialogTitle>
          <DialogDescription>
            Upload a document (PDF, spreadsheet, text, or image) and AWP's assistant will draft an
            invoice from it. You'll review everything before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          {file ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setFile(null)}
                disabled={loading}
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
              <p className="text-sm font-medium">Click to upload or drag a file here</p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, XLS/XLSX, CSV, TXT, or an image · up to 12 MB
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

          <div className="space-y-2">
            <Label htmlFor="ai-instruction">What should this invoice say? (optional)</Label>
            <Textarea
              id="ai-instruction"
              rows={3}
              placeholder="e.g. Bill Northwind for the hours in this sheet, add 8.5% tax, due in 14 days."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button onClick={generate} disabled={loading || !file} className="w-full gap-1">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Reading document…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate draft
              </>
            )}
          </Button>
          {loading ? (
            <p className="text-center text-xs text-muted-foreground">
              This can take a few seconds for larger files.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
