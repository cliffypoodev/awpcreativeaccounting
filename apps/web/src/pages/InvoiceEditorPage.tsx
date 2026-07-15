import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentEditor, type DocumentDraft } from "@/components/app/DocumentEditor";
import { AiImportDialog } from "@/components/app/AiImportDialog";
import { useInvoice, useSaveInvoice, useOrg } from "@/lib/queries";
import { todayISO, addDaysISO, errMsg } from "@/lib/format";
import type { InvoiceInput, AiInvoiceDraft } from "@/lib/shared";
import { toast } from "sonner";

export default function InvoiceEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: org } = useOrg();
  const save = useSaveInvoice();

  const [aiOpen, setAiOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState<AiInvoiceDraft | null>(null);
  // bump to force the editor to re-initialize when an AI draft loads
  const [aiKey, setAiKey] = useState(0);

  const onSave = (input: InvoiceInput) => {
    save.mutate(
      { id, input },
      {
        onSuccess: (saved) => {
          toast.success(isEdit ? "Invoice updated." : "Invoice created.");
          navigate(`/app/invoices/${saved.id}`);
        },
        onError: (err) => toast.error(errMsg(err)),
      }
    );
  };

  if (isEdit && isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-secondary/60" />;
  }

  let draft: DocumentDraft;
  if (aiDraft) {
    draft = {
      clientId: aiDraft.matchedClientId ?? "",
      number: "",
      issueDate: aiDraft.issueDate,
      secondDate: aiDraft.dueDate,
      currency: aiDraft.currency,
      items: aiDraft.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
      })),
      discounts:
        aiDraft.discountPercent && aiDraft.discountPercent > 0
          ? [{ type: "percentage", value: aiDraft.discountPercent }]
          : [],
      deposits: [],
      notes: aiDraft.notes ?? "",
      terms: org?.defaultTerms ?? "",
    };
  } else if (invoice) {
    draft = {
      clientId: invoice.clientId ?? "",
      number: invoice.number,
      issueDate: invoice.issueDate,
      secondDate: invoice.dueDate,
      currency: invoice.currency,
      items: invoice.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
      })),
      discounts: invoice.discounts.map((d) => ({
        type: d.type as "percentage" | "fixed",
        value: d.value,
      })),
      deposits: invoice.deposits.map((d) => ({
        description: d.description ?? "Deposit",
        amount: d.amount,
      })),
      notes: invoice.notes ?? "",
      terms: invoice.terms ?? "",
    };
  } else {
    draft = {
      clientId: "",
      number: "",
      issueDate: todayISO(),
      secondDate: addDaysISO(org?.defaultPaymentTerms ?? 30),
      currency: org?.defaultCurrency ?? "USD",
      items: [{ description: "", quantity: 1, unitPrice: 0, taxRate: org?.defaultTaxRate ?? 0 }],
      discounts: [],
      deposits: [],
      notes: org?.defaultNotes ?? "",
      terms: org?.defaultTerms ?? "",
    };
  }

  const unmatchedClient =
    aiDraft && !aiDraft.matchedClientId && aiDraft.client.name ? aiDraft.client.name : null;

  const notice = aiDraft ? (
    <div className="rounded-lg border border-primary/30 bg-accent/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium text-foreground">AI draft — please review before saving.</p>
            <p className="mt-0.5 text-muted-foreground">{aiDraft.summary}</p>
            {unmatchedClient ? (
              <p className="mt-1.5 text-amber">
                Suggested client “{unmatchedClient}” isn't in your list yet — pick a client below, or
                add “{unmatchedClient}” first from the Clients page.
              </p>
            ) : null}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => {
            setAiDraft(null);
            setAiKey((k) => k + 1);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {!isEdit ? (
        <div className="mb-4 flex justify-end">
          <Button variant="outline" onClick={() => setAiOpen(true)} className="gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" /> Import with AI
          </Button>
        </div>
      ) : null}

      <DocumentEditor
        key={aiDraft ? `ai-${aiKey}` : isEdit ? id : "new"}
        kind="invoice"
        initial={draft}
        saving={save.isPending}
        onSave={(input) => onSave(input as InvoiceInput)}
        backTo={isEdit ? `/app/invoices/${id}` : "/app/invoices"}
        title={isEdit ? `Edit ${invoice?.number ?? "invoice"}` : "New invoice"}
        notice={notice}
      />

      <AiImportDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        onDraft={(d) => {
          setAiDraft(d);
          setAiKey((k) => k + 1);
        }}
      />
    </>
  );
}
