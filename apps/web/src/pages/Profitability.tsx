import { useState } from "react";
import { DollarSign, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfitability } from "@/lib/queries";
import { PageHeader, EmptyState, TableSkeleton } from "@/components/app/ui-bits";
import { ProjectCostDialog } from "@/components/app/ProjectCostDialog";
import { PROJECT_SERVICE_TYPES } from "@/lib/shared";
import type { ProjectProfitabilityRow } from "@/lib/shared";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

const SERVICE_LABELS: Record<string, string> = {
  commercial: "Commercial",
  voiceover: "Voiceover",
  podcast: "Podcast",
  drone: "Drone",
};

const SERVICE_COLORS: Record<string, string> = {
  commercial: "bg-blue-100 text-blue-700 border-blue-200",
  voiceover: "bg-purple-100 text-purple-700 border-purple-200",
  podcast: "bg-green-100 text-green-700 border-green-200",
  drone: "bg-amber-100 text-amber-700 border-amber-200",
};

const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  quoted: "Quoted",
  booked: "Booked",
  filming_recording: "Filming / Recording",
  editing: "Editing",
  review: "Review",
  delivered: "Delivered",
  closed: "Closed",
};

function marginClass(pct: number): string {
  if (pct >= 50) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (pct >= 25) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

interface CostDialogState {
  projectId: string;
  projectName: string;
}

export default function Profitability() {
  const { data, isLoading } = useProfitability();
  const [costDialog, setCostDialog] = useState<CostDialogState | null>(null);

  const projects = data?.projects ?? [];
  const serviceLines = data?.serviceLines ?? [];

  const hasCosts = projects.some((p) => p.totalCosts > 0);

  // Build service line map by type (fill in 0s for missing types)
  const serviceMap = Object.fromEntries(serviceLines.map((s) => [s.serviceType, s]));

  return (
    <div>
      <PageHeader
        title="Profitability"
        subtitle="Margin per project and service line."
      />

      {/* Service line summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(PROJECT_SERVICE_TYPES as readonly string[]).map((type) => {
          const sl = serviceMap[type];
          const billed = sl?.totalBilled ?? 0;
          const costs = sl?.totalCosts ?? 0;
          const margin = sl?.grossMargin ?? 0;
          const pct = sl?.grossMarginPct ?? 0;

          return (
            <div
              key={type}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    SERVICE_COLORS[type] ?? ""
                  )}
                >
                  {SERVICE_LABELS[type] ?? type}
                </span>
                {sl ? (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      marginClass(pct)
                    )}
                  >
                    {pct.toFixed(1)}%
                  </span>
                ) : null}
              </div>
              <p className="text-lg font-semibold tabular-nums">{money(margin)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {money(billed)} billed · {money(costs)} costs
              </p>
            </div>
          );
        })}
      </div>

      {/* Tip when projects exist but none have costs */}
      {projects.length > 0 && !hasCosts ? (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="h-4 w-4 shrink-0" />
          Add costs to a project to see profitability margins.
        </div>
      ) : null}

      {/* Per-project table */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No projects yet"
          description="Create projects and add costs to start tracking profitability."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Project</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Client</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Service</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Billed</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Costs</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Margin</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Margin %</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground sr-only">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p: ProjectProfitabilityRow) => (
                  <tr key={p.projectId} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.projectName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.referenceCode}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {p.clientName ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          SERVICE_COLORS[p.serviceType] ?? ""
                        )}
                      >
                        {SERVICE_LABELS[p.serviceType] ?? p.serviceType}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                      {STATUS_LABELS[p.status] ?? p.status}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {money(p.totalBilled, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {money(p.totalCosts, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {money(p.grossMargin, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs font-medium",
                          marginClass(p.grossMarginPct)
                        )}
                      >
                        {p.grossMarginPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Add costs"
                        onClick={() =>
                          setCostDialog({ projectId: p.projectId, projectName: p.projectName })
                        }
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {costDialog ? (
        <ProjectCostDialog
          projectId={costDialog.projectId}
          projectName={costDialog.projectName}
          open={!!costDialog}
          onOpenChange={(o) => (!o ? setCostDialog(null) : undefined)}
        />
      ) : null}
    </div>
  );
}
