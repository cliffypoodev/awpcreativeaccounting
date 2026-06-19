/** InvoiceForge — shared domain types (framework-agnostic). */
import type { InvoiceStatus, EstimateStatus, Role, PlanId } from './constants.js';

export interface Money {
  amount: number;
  currency: string;
}

export interface DashboardKpis {
  revenue: number;
  outstanding: number;
  overdue: number;
  paidThisMonth: number;
  revenueSeries: { date: string; value: number }[];
}

export interface AiInsight {
  type: 'overdue_alert' | 'revenue_forecast' | 'client_reengagement' | 'anomaly';
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  orgId: string;
}

export type { InvoiceStatus, EstimateStatus, Role, PlanId };
