import { api } from "./api";

export interface DashboardSummary {
  totalProducts: number;
  totalStockValue: number;
  expiredCount: number;
  outOfStockCount: number;
  lowStockCount: number;
  expiringSoonCount: number;
  totalSales: number;
  transactionCount: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  recentTransactions: unknown[];
  recentAdjustments: unknown[];
}

export async function getDashboard(): Promise<DashboardResponse> {
  const response = await api.get<DashboardResponse>(
    "/dashboard",
  );

  return response.data;
}

export default getDashboard;