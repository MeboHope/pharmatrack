
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Clock,
  Package,
  PlusCircle,
  ShoppingCart,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import type {
  DispenseTransaction,
  Drug,
  PharmacySettings,
  TabType,
} from "../types";

import {
  api,
  getApiErrorMessage,
} from "../services/api";

import type {
  DashboardSummary as ServiceDashboardSummary,
} from "../services/dashboard";

import { SalesOverviewGraph } from "./SalesOverviewGraph";

interface DashboardSummary extends ServiceDashboardSummary {
  inStockCount: number;
  totalPatients: number;
  totalSuppliers: number;
}

interface DashboardApiData {
  summary: Partial<DashboardSummary>;
  recentTransactions: unknown[];
  recentAdjustments: unknown[];
}

interface DashboardProps {
  drugs: Drug[];
  transactions: DispenseTransaction[];
  settings: PharmacySettings;
  setActiveTab: (tab: TabType) => void;
  onQuickDispense: () => void;
  onReceiveStock: () => void;
  onRecordAdjustment: () => void;
}

const PIE_COLORS = [
  "#0F766E",
  "#1D4ED8",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#10B981",
];

const EMPTY_SUMMARY: DashboardSummary = {
  totalProducts: 0,
  totalStockValue: 0,
  expiredCount: 0,
  outOfStockCount: 0,
  lowStockCount: 0,
  expiringSoonCount: 0,
  transactionCount: 0,
  inStockCount: 0,
  totalPatients: 0,
  totalSuppliers: 0,
  totalSales: 0,
};

const formatNumber = (
  value: number,
): string =>
  Number(value || 0).toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 2,
    },
  );

export const Dashboard: React.FC<DashboardProps> = ({
  drugs = [],
  transactions = [],
  settings,
  setActiveTab,
  onQuickDispense,
  onReceiveStock,
  onRecordAdjustment,
}) => {
  const safeDrugs = drugs ?? [];
  const safeTransactions = transactions ?? [];

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [summaryLoading, setSummaryLoading] =
    useState(true);

  const [summaryError, setSummaryError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    const loadDashboardSummary = async () => {
      setSummaryLoading(true);
      setSummaryError("");

      try {
        const response =
          await api.get<DashboardApiData>(
            "/dashboard",
          );

        const serverSummary =
          response.data?.summary;

        if (!serverSummary) {
          throw new Error(
            "The server returned an invalid dashboard summary.",
          );
        }

        const normalizedSummary: DashboardSummary = {
          totalProducts: Number(
            serverSummary.totalProducts ?? 0,
          ),
          totalStockValue: Number(
            serverSummary.totalStockValue ?? 0,
          ),
          expiredCount: Number(
            serverSummary.expiredCount ?? 0,
          ),
          outOfStockCount: Number(
            serverSummary.outOfStockCount ?? 0,
          ),
          lowStockCount: Number(
            serverSummary.lowStockCount ?? 0,
          ),
          expiringSoonCount: Number(
            serverSummary.expiringSoonCount ?? 0,
          ),
          transactionCount: Number(
            serverSummary.transactionCount ?? 0,
          ),
          inStockCount: Number(
            serverSummary.inStockCount ?? 0,
          ),
          totalPatients: Number(
            serverSummary.totalPatients ?? 0,
          ),
          totalSuppliers: Number(
            serverSummary.totalSuppliers ?? 0,
          ),
          totalSales: Number(
            serverSummary.totalSales ?? 0,
          ),
        };

        if (!cancelled) {
          setSummary(normalizedSummary);
        }
      } catch (error) {
        if (!cancelled) {
          setSummaryError(
            getApiErrorMessage(
              error,
              "Unable to load dashboard statistics.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    };

    void loadDashboardSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const dashboardSummary =
    summary ?? EMPTY_SUMMARY;

  /*
   * Inventory summary cards use server-calculated
   * Product and DrugBatch data.
   *
   * The legacy Drug state remains in use for the
   * category chart until that chart is migrated.
   */
  const totalProducts =
    dashboardSummary.totalProducts;

  const totalStockValue =
    dashboardSummary.totalStockValue;

  const expiredCount =
    dashboardSummary.expiredCount;

  const outOfStockCount =
    dashboardSummary.outOfStockCount;

  const lowStockCount =
    dashboardSummary.lowStockCount;

  const expiringSoonCount =
    dashboardSummary.expiringSoonCount;

  /*
   * Group legacy inventory by category for
   * the existing pie chart.
   */
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};

    safeDrugs.forEach((drug) => {
      const category = drug.category || "Other";

      counts[category] =
        (counts[category] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);

    if (sorted.length <= 5) {
      return sorted;
    }

    const topFour = sorted.slice(0, 4);

    const otherValue = sorted
      .slice(4)
      .reduce(
        (total, item) => total + item.value,
        0,
      );

    return [
      ...topFour,
      {
        name: "Other",
        value: otherValue,
      },
    ];
  }, [safeDrugs]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>

          <p className="text-sm text-slate-500 font-medium mt-1">
            Welcome to{" "}
            <span className="text-[#22577A] font-semibold">
              {settings?.pharmacyName || "PharmaTrack"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onQuickDispense}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#22577A] hover:bg-[#1a4460] rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Quick Dispense
          </button>

          <button
            type="button"
            onClick={onReceiveStock}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-[#22577A]" />
            Receive Stock
          </button>

          <button
            type="button"
            onClick={onRecordAdjustment}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm"
          >
            Record Adjustment
          </button>
        </div>
      </div>

      {/* Dashboard summary loading/error state */}
      {summaryLoading && (
        <div
          role="status"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
        >
          Loading live inventory statistics...
        </div>
      )}

      {!summaryLoading && summaryError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <p className="font-semibold">
            Dashboard statistics could not be loaded.
          </p>

          <p className="mt-1">
            {summaryError}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 font-semibold underline underline-offset-2"
          >
            Reload dashboard
          </button>
        </div>
      )}

      {/* Critical Action */}
      {!summaryLoading && !summaryError && expiredCount > 0 && (
        <div
          className="p-4 rounded-xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{
            backgroundColor: "#D71D2D",
          }}
        >
          <div className="flex items-start md:items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10 shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>

            <div>
              <div className="font-bold text-sm tracking-wide uppercase">
                Critical Action Required
              </div>

              <p className="text-sm text-white/95 mt-0.5">
                {expiredCount} item(s) have expired.
                Please check the inventory.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className="px-4 py-2 text-xs font-bold text-[#D71D2D] bg-white hover:bg-slate-100 rounded-lg transition-colors shrink-0 shadow-sm"
          >
            View Inventory
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Total Products
            </span>

            <div className="p-2.5 rounded-lg bg-slate-100 text-[#22577A]">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {summaryLoading ? "—" : totalProducts}
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Active items in catalog
            </p>
          </div>
        </div>

        {/* Stock Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Stock Value
            </span>

            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Banknote className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {summaryLoading
                ? "—"
                : `${settings?.currency || "KES"} ${Number(
                    totalStockValue,
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Total value at buying price
            </p>
          </div>
        </div>

        {/* Expiring */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Expiring Soon
            </span>

            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {summaryLoading ? "—" : expiringSoonCount}
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Items within expiry alert period
            </p>
          </div>
        </div>

        {/* Reorder */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Below Reorder Level
            </span>

            <div className="p-2.5 rounded-lg bg-rose-50 text-[#D71D2D]">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {summaryLoading ? "—" : lowStockCount}
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Items needing replenishment
            </p>
          </div>
        </div>
      </div>

      {/* Additional Inventory Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Out of Stock
              </p>

              <p className="text-xl font-bold text-slate-900 mt-1">
                {summaryLoading ? "—" : outOfStockCount}
              </p>
            </div>

            <Package className="w-5 h-5 text-rose-500" />
          </div>

          <p className="text-xs text-slate-500 mt-1">
            Products currently unavailable
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dispensing")}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Transactions
              </p>

              <p className="text-xl font-bold text-slate-900 mt-1">
                {summaryLoading
                  ? "—"
                  : formatNumber(
                      dashboardSummary.transactionCount,
                    )}
              </p>
            </div>

            <ShoppingCart className="w-5 h-5 text-[#22577A]" />
          </div>

          <p className="text-xs text-slate-500 mt-1">
            Recorded dispensing and POS transactions
          </p>
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesOverviewGraph
          transactions={safeTransactions}
          settings={settings}
          selectId="select-sales-overview-dashboard"
        />

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">
            Inventory by Category
          </h2>

          <div className="h-64 w-full flex flex-col items-center justify-between py-2">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell
                        key={`category-${index}`}
                        fill={
                          PIE_COLORS[
                            index % PIE_COLORS.length
                          ]
                        }
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-600 font-medium px-2">
              {categoryData.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        PIE_COLORS[
                          index % PIE_COLORS.length
                        ],
                    }}
                  />

                  <span>
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent Transactions
            </h2>

            <p className="text-xs text-slate-500">
              Latest prescription dispenses &amp; POS sales
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("dispensing")}
            className="text-xs font-semibold text-[#22577A] hover:text-[#1a4460] flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6">ID</th>
                <th className="py-3.5 px-6">DATE</th>
                <th className="py-3.5 px-6">PATIENT</th>
                <th className="py-3.5 px-6">AMOUNT</th>
                <th className="py-3.5 px-6">PAYMENT</th>
                <th className="py-3.5 px-6">STATUS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {safeTransactions.slice(0, 5).map((transaction) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-4 px-6 font-semibold text-[#22577A]">
                    {transaction.id}
                  </td>

                  <td className="py-4 px-6 text-slate-600 text-xs">
                    {transaction.date}
                  </td>

                  <td className="py-4 px-6 font-medium text-slate-900">
                    {transaction.patientName}
                  </td>

                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {settings?.currency || "KES"}{" "}
                    {Number(
                      transaction.totalAmount || 0,
                    ).toFixed(2)}
                  </td>

                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                      {transaction.paymentMethod}
                    </span>
                  </td>

                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        transaction.status === "Completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : transaction.status === "Pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          transaction.status === "Completed"
                            ? "bg-emerald-500"
                            : transaction.status === "Pending"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        }`}
                      />

                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}

              {safeTransactions.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm text-slate-400"
                  >
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Synchronization status */}
      <div
        className={`text-[11px] font-medium ${
          summaryError
            ? "text-rose-600"
            : summaryLoading
              ? "text-slate-500"
              : "text-emerald-600"
        }`}
      >
        {summaryError
          ? "Dashboard summary is not synchronized with the server."
          : summaryLoading
            ? "Synchronizing dashboard with the PharmaTrack server..."
            : "Inventory summary synchronized with the PharmaTrack server."}
      </div>
    </div>
  );
};

export default Dashboard;