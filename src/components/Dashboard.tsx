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

import { SalesOverviewGraph } from "./SalesOverviewGraph";
import {
  getDashboard,
  type DashboardSummary,
} from "../services/dashboard";

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
  totalSales: 0,
  transactionCount: 0,
};

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

  const [serverSummary, setServerSummary] =
    useState<DashboardSummary>(EMPTY_SUMMARY);

  const [dashboardLoading, setDashboardLoading] =
    useState(true);

  const [dashboardError, setDashboardError] =
    useState("");

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError("");

      try {
        const dashboard = await getDashboard();

        if (!mounted) return;

        setServerSummary({
          ...EMPTY_SUMMARY,
          ...dashboard.summary,
        });
      } catch (error) {
        if (!mounted) return;

        console.error(
          "Failed to load dashboard:",
          error,
        );

        setDashboardError(
          error instanceof Error
            ? error.message
            : "Unable to load dashboard data.",
        );
      } finally {
        if (mounted) {
          setDashboardLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Use the server/database values when available.
   * The frontend values remain as a safe fallback while
   * the backend is empty or unavailable.
   */

  const localExpiredCount = useMemo(
    () =>
      safeDrugs.filter(
        (drug) => drug.status === "Expired",
      ).length,
    [safeDrugs],
  );

  const localOutOfStockCount = useMemo(
    () =>
      safeDrugs.filter(
        (drug) =>
          drug.qty === 0 ||
          drug.status === "Out of Stock",
      ).length,
    [safeDrugs],
  );

  const localLowStockCount = useMemo(
    () =>
      safeDrugs.filter(
        (drug) =>
          drug.qty > 0 &&
          drug.qty <=
            (settings?.reorderAlertLevel || 10),
      ).length,
    [safeDrugs, settings],
  );

  const localStockValue = useMemo(
    () =>
      safeDrugs.reduce(
        (total, drug) =>
          total +
          (drug.buyingPrice || 0) *
            (drug.qty || 0),
        0,
      ),
    [safeDrugs],
  );

  const localExpiringSoonCount = useMemo(() => {
    const now = new Date();
    const alertDays =
      settings?.expiryAlertDays || 90;

    const alertMilliseconds =
      alertDays *
      24 *
      60 *
      60 *
      1000;

    return safeDrugs.filter((drug) => {
      if (drug.status === "Expired") {
        return false;
      }

      const expiry = new Date(
        drug.expiryDate,
      );

      const difference =
        expiry.getTime() -
        now.getTime();

      return (
        difference > 0 &&
        difference <= alertMilliseconds
      );
    }).length;
  }, [safeDrugs, settings]);

  const totalProducts =
    serverSummary.totalProducts ||
    safeDrugs.length;

  const totalStockValue =
    serverSummary.totalStockValue ||
    localStockValue;

  const expiredCount =
    serverSummary.expiredCount ||
    localExpiredCount;

  const outOfStockCount =
    serverSummary.outOfStockCount ||
    localOutOfStockCount;

  const lowStockCount =
    serverSummary.lowStockCount ||
    localLowStockCount;

  const expiringSoonCount =
    serverSummary.expiringSoonCount ||
    localExpiringSoonCount;

  const categoryData = useMemo(() => {
    const counts: Record<
      string,
      number
    > = {};

    safeDrugs.forEach((drug) => {
      const category =
        drug.category || "Other";

      counts[category] =
        (counts[category] || 0) + 1;
    });

    const sorted = Object.entries(
      counts,
    )
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort(
        (a, b) => b.value - a.value,
      );

    if (sorted.length <= 5) {
      return sorted;
    }

    const topFour =
      sorted.slice(0, 4);

    const otherValue =
      sorted
        .slice(4)
        .reduce(
          (total, item) =>
            total + item.value,
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
              {settings?.pharmacyName ||
                "PharmaTrack"}
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

      {/* Backend loading indicator */}
      {dashboardLoading && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 rounded-xl px-4 py-3 text-xs font-medium">
          Loading live dashboard data...
        </div>
      )}

      {/* Backend error */}
      {dashboardError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-xs">
          Live dashboard data could not be loaded.
          Showing available local application data.
        </div>
      )}

      {/* Critical Action */}
      {expiredCount > 0 && (
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
            onClick={() =>
              setActiveTab("inventory")
            }
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
              {totalProducts}
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
              {settings.currency}{" "}
              {Number(
                totalStockValue,
              ).toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}
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
              {expiringSoonCount}
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
              {lowStockCount}
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Items needing replenishment
            </p>
          </div>
        </div>
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
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
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
                    {categoryData.map(
                      (_, index) => (
                        <Cell
                          key={`category-${index}`}
                          fill={
                            PIE_COLORS[
                              index %
                                PIE_COLORS.length
                            ]
                          }
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ),
                    )}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-600 font-medium px-2">
              {categoryData.map(
                (item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          PIE_COLORS[
                            index %
                              PIE_COLORS.length
                          ],
                      }}
                    />

                    <span>
                      {item.name} ({item.value})
                    </span>
                  </div>
                ),
              )}
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
              Latest prescription dispenses & POS sales
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setActiveTab("dispensing")
            }
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
                <th className="py-3.5 px-6">
                  ID
                </th>

                <th className="py-3.5 px-6">
                  DATE
                </th>

                <th className="py-3.5 px-6">
                  PATIENT
                </th>

                <th className="py-3.5 px-6">
                  AMOUNT
                </th>

                <th className="py-3.5 px-6">
                  PAYMENT
                </th>

                <th className="py-3.5 px-6">
                  STATUS
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {safeTransactions
                .slice(0, 5)
                .map((transaction) => (
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
                      {
                        transaction.patientName
                      }
                    </td>

                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {settings.currency}{" "}
                      {Number(
                        transaction.totalAmount ||
                          0,
                      ).toFixed(2)}
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                        {
                          transaction.paymentMethod
                        }
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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

      {/* Backend status */}
      {!dashboardLoading &&
        !dashboardError && (
          <div className="text-[11px] text-emerald-600 font-medium">
            Dashboard data synchronized with the
            PharmaTrack server.
          </div>
        )}

      {/* Avoid unused-variable warnings */}
      {void outOfStockCount}
    </div>
  );
};

export default Dashboard;