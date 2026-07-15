import { useParams, useNavigate } from "react-router-dom";
import { DocumentEditor, type DocumentDraft } from "@/components/app/DocumentEditor";
import { useEstimate, useSaveEstimate, useOrg } from "@/lib/queries";
import { todayISO, addDaysISO, errMsg } from "@/lib/format";
import type { EstimateInput } from "@/lib/shared";
import { toast } from "sonner";

export default function EstimateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { data: estimate, isLoading } = useEstimate(id);
  const { data: org } = useOrg();
  const save = useSaveEstimate();

  const onSave = (input: EstimateInput) => {
    save.mutate(
      { id, input },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Estimate updated." : "Estimate created.");
          navigate("/app/estimates");
        },
        onError: (err) => toast.error(errMsg(err)),
      }
    );
  };

  if (isEdit && isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-secondary/60" />;
  }

  const draft: DocumentDraft = estimate
    ? {
        clientId: estimate.clientId ?? "",
        number: estimate.number,
        issueDate: estimate.issueDate,
        secondDate: estimate.expiryDate ?? "",
        currency: estimate.currency,
        items: estimate.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate,
        })),
        discounts: estimate.discounts.map((d) => ({
          type: d.type as "percentage" | "fixed",
          value: d.value,
        })),
        deposits: [],
        notes: estimate.notes ?? "",
        terms: estimate.terms ?? "",
      }
    : {
        clientId: "",
        number: "",
        issueDate: todayISO(),
        secondDate: addDaysISO(30),
        currency: org?.defaultCurrency ?? "USD",
        items: [{ description: "", quantity: 1, unitPrice: 0, taxRate: org?.defaultTaxRate ?? 0 }],
        discounts: [],
        deposits: [],
        notes: org?.defaultNotes ?? "",
        terms: org?.defaultTerms ?? "",
      };

  return (
    <DocumentEditor
      kind="estimate"
      initial={draft}
      saving={save.isPending}
      onSave={(input) => onSave(input as EstimateInput)}
      backTo="/app/estimates"
      title={isEdit ? `Edit ${estimate?.number ?? "estimate"}` : "New estimate"}
    />
  );
}
