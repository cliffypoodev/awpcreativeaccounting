import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  ClientRow,
  InvoiceRow,
  EstimateRow,
  ExpenseRow,
  OrgRow,
  DashboardStats,
  ClientInput,
  InvoiceInput,
  EstimateInput,
  ExpenseInput,
  OrgUpdateInput,
  TagRow,
  ProjectRow,
  TagInput,
  ProjectInput,
  RecurringScheduleRow,
  RecurringInput,
  ProjectCostRow,
  ProjectCostInput,
  ProjectProfitabilityRow,
  ServiceLineSummaryRow,
  DeliverableRow,
  DeliverableInput,
  CostWithProjectRow,
} from "./shared";

// ─── Me / Org ─────────────────────────────────────────────────────
export interface MeResponse {
  user: { id: string; name: string; email: string };
  org: { id: string; name: string; slug: string; brandColor: string } | null;
}

export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => api.get<MeResponse>("/api/me") });

export const useOrg = () =>
  useQuery({ queryKey: ["org"], queryFn: () => api.get<OrgRow>("/api/org") });

export function useUpdateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrgUpdateInput) => api.patch<OrgRow>("/api/org", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useSeedDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ seeded: boolean }>("/api/me/seed-demo", {}),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ─── Dashboard ────────────────────────────────────────────────────
export const useDashboard = () =>
  useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardStats>("/api/dashboard") });

// ─── Clients ──────────────────────────────────────────────────────
export const useClients = () =>
  useQuery({ queryKey: ["clients"], queryFn: () => api.get<ClientRow[]>("/api/clients") });

export function useSaveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ClientInput }) =>
      id ? api.put<ClientRow>(`/api/clients/${id}`, input) : api.post<ClientRow>("/api/clients", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────────
export const useInvoices = () =>
  useQuery({ queryKey: ["invoices"], queryFn: () => api.get<InvoiceRow[]>("/api/invoices") });

export const useInvoice = (id: string | undefined) =>
  useQuery({
    queryKey: ["invoice", id],
    queryFn: () => api.get<InvoiceRow>(`/api/invoices/${id}`),
    enabled: !!id,
  });

function invalidateInvoiceCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["invoices"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["clients"] });
}

export function useSaveInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: InvoiceInput }) =>
      id ? api.put<InvoiceRow>(`/api/invoices/${id}`, input) : api.post<InvoiceRow>("/api/invoices", input),
    onSuccess: () => invalidateInvoiceCaches(qc),
  });
}

export function useInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<InvoiceRow>(`/api/invoices/${id}/status`, { status }),
    onSuccess: (_d, v) => {
      invalidateInvoiceCaches(qc);
      qc.invalidateQueries({ queryKey: ["invoice", v.id] });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/invoices/${id}`),
    onSuccess: () => invalidateInvoiceCaches(qc),
  });
}

// ─── Estimates ────────────────────────────────────────────────────
export const useEstimates = () =>
  useQuery({ queryKey: ["estimates"], queryFn: () => api.get<EstimateRow[]>("/api/estimates") });

export const useEstimate = (id: string | undefined) =>
  useQuery({
    queryKey: ["estimate", id],
    queryFn: () => api.get<EstimateRow>(`/api/estimates/${id}`),
    enabled: !!id,
  });

export function useSaveEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: EstimateInput }) =>
      id ? api.put<EstimateRow>(`/api/estimates/${id}`, input) : api.post<EstimateRow>("/api/estimates", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimates"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useConvertEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<InvoiceRow>(`/api/estimates/${id}/convert`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimates"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/estimates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimates"] }),
  });
}

// ─── Tags ─────────────────────────────────────────────────────────
export const useTags = () =>
  useQuery({ queryKey: ["tags"], queryFn: () => api.get<TagRow[]>("/api/tags") });

export function useSaveTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TagInput }) =>
      id ? api.put<TagRow>(`/api/tags/${id}`, input) : api.post<TagRow>("/api/tags", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/tags/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ─── Projects ─────────────────────────────────────────────────────
export const useProjects = () =>
  useQuery({ queryKey: ["projects"], queryFn: () => api.get<ProjectRow[]>("/api/projects") });

export const useProject = (id: string | undefined) =>
  useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<ProjectRow>(`/api/projects/${id}`),
    enabled: !!id,
  });

export function useSaveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ProjectInput }) =>
      id ? api.put<ProjectRow>(`/api/projects/${id}`, input) : api.post<ProjectRow>("/api/projects", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<ProjectRow>(`/api/projects/${id}/status`, { status }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", v.id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ─── Expenses ─────────────────────────────────────────────────────
export const useExpenses = () =>
  useQuery({ queryKey: ["expenses"], queryFn: () => api.get<ExpenseRow[]>("/api/expenses") });

export function useSaveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ExpenseInput }) =>
      id ? api.put<ExpenseRow>(`/api/expenses/${id}`, input) : api.post<ExpenseRow>("/api/expenses", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ─── Recurring Schedules ──────────────────────────────────────────
export const useRecurring = () =>
  useQuery({ queryKey: ["recurring"], queryFn: () => api.get<RecurringScheduleRow[]>("/api/recurring") });

export const useRecurringSchedule = (id: string | undefined) =>
  useQuery({
    queryKey: ["recurring", id],
    queryFn: () => api.get<RecurringScheduleRow>(`/api/recurring/${id}`),
    enabled: !!id,
  });

export function useSaveRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: RecurringInput }) =>
      id
        ? api.put<RecurringScheduleRow>(`/api/recurring/${id}`, input)
        : api.post<RecurringScheduleRow>("/api/recurring", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
}

export function useGenerateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ invoiceId: string; invoiceNumber: string; nextDate: string }>(`/api/recurring/${id}/generate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/recurring/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
}

// ─── Estimate approval ────────────────────────────────────────────
export function useApproveEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { signerName: string; signerEmail: string } }) =>
      api.post<EstimateRow>(`/api/estimates/${id}/approve`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimates"] }),
  });
}

// ─── Project Costs ────────────────────────────────────────────
export const useProjectCosts = (projectId: string | undefined) =>
  useQuery({
    queryKey: ["project-costs", projectId],
    queryFn: () => api.get<ProjectCostRow[]>(`/api/projects/${projectId}/costs`),
    enabled: !!projectId,
  });

export function useSaveProjectCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      id,
      input,
    }: {
      projectId: string;
      id?: string;
      input: ProjectCostInput;
    }) =>
      id
        ? api.patch<ProjectCostRow>(`/api/projects/${projectId}/costs/${id}`, input)
        : api.post<ProjectCostRow>(`/api/projects/${projectId}/costs`, input),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["project-costs", v.projectId] });
      qc.invalidateQueries({ queryKey: ["profitability"] });
    },
  });
}

export function useDeleteProjectCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, id }: { projectId: string; id: string }) =>
      api.delete(`/api/projects/${projectId}/costs/${id}`),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["project-costs", v.projectId] });
      qc.invalidateQueries({ queryKey: ["profitability"] });
    },
  });
}

// ─── Profitability ────────────────────────────────────────────
export const useProfitability = () =>
  useQuery({
    queryKey: ["profitability"],
    queryFn: () =>
      api.get<{ projects: ProjectProfitabilityRow[]; serviceLines: ServiceLineSummaryRow[] }>(
        "/api/profitability"
      ),
  });

// ─── Deliverables (asset catalog) ─────────────────────────────
export const useDeliverables = () =>
  useQuery({
    queryKey: ["deliverables"],
    queryFn: () => api.get<DeliverableRow[]>("/api/deliverables"),
  });

export function useSaveDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: DeliverableInput }) =>
      id
        ? api.put<DeliverableRow>(`/api/deliverables/${id}`, input)
        : api.post<DeliverableRow>("/api/deliverables", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliverables"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/deliverables/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliverables"] }),
  });
}

// ─── Costs feed (receipt inbox) ───────────────────────────────
export const useCosts = () =>
  useQuery({
    queryKey: ["costs"],
    queryFn: () => api.get<CostWithProjectRow[]>("/api/costs"),
  });

export function useFileReceiptCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: ProjectCostInput }) =>
      api.post<ProjectCostRow>(`/api/projects/${projectId}/costs`, input),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["costs"] });
      qc.invalidateQueries({ queryKey: ["project-costs", v.projectId] });
      qc.invalidateQueries({ queryKey: ["profitability"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
