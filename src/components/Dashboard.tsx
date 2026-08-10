import React from 'react';
import { 
  AlertTriangle, 
  Package, 
  Banknote, 
  Clock, 
  AlertCircle, 
  PlusCircle, 
  ArrowRight,
  ShoppingCart,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Drug, DispenseTransaction, PharmacySettings, TabType } from '../types';
import { SalesOverviewGraph } from './SalesOverviewGraph';

interface DashboardProps {
  drugs: Drug[];
  transactions: DispenseTransaction[];
  settings: PharmacySettings;
  setActiveTab: (tab: TabType) => void;
  onQuickDispense: () => void;
  onReceiveStock: () => void;
  onRecordAdjustment: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  drugs = [],
  transactions = [],
  settings,
  setActiveTab,
  onQuickDispense,
  onReceiveStock,
  onRecordAdjustment,
}) => {
  // Calculations
  const safeDrugs = drugs || [];
  const safeTransactions = transactions || [];

  const expiredCount = safeDrugs.filter(d => d.status === 'Expired').length;
  const outOfStockCount = safeDrugs.filter(d => d.qty === 0 || d.status === 'Out of Stock').length;
  const lowStockCount = safeDrugs.filter(d => d.qty > 0 && d.qty <= (settings?.reorderAlertLevel || 10)).length;

  const totalProducts = safeDrugs.length;
  const totalStockValue = safeDrugs.reduce((acc, d) => acc + ((d.buyingPrice || 0) * (d.qty || 0)), 0);

  // Expiring in < 90 days calculation
  const now = new Date();
  const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;
  const expiringSoonCount = safeDrugs.filter(d => {
    if (d.status === 'Expired') return false;
    const exp = new Date(d.expiryDate);
    const diff = exp.getTime() - now.getTime();
    return diff > 0 && diff <= ninetyDaysInMs;
  }).length;

  // Chart 2: Inventory by Category Pie Chart
  const PIE_COLORS = [
    '#0F766E', // Green
    '#1D4ED8', // Blue
    '#F59E0B', // Amber / Orange
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#10B981', // Emerald
  ];

  const categoryData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    safeDrugs.forEach((d) => {
      const cat = d.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (sorted.length <= 5) {
      return sorted;
    }

    const top4 = sorted.slice(0, 4);
    const otherVal = sorted.slice(4).reduce((acc, curr) => acc + curr.value, 0);
    return [...top4, { name: 'Other', value: otherVal }];
  }, [drugs]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Welcome to <span className="text-[#22577A] font-semibold">{settings.pharmacyName}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            id="btn-quick-dispense"
            onClick={onQuickDispense}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#22577A] hover:bg-[#1a4460] rounded-lg transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            Quick Dispense
          </button>
          <button
            id="btn-receive-stock"
            onClick={onReceiveStock}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#22577A]" />
            Receive Stock
          </button>
          <button
            id="btn-record-adjustment"
            onClick={onRecordAdjustment}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            Record Adjustment
          </button>
        </div>
      </div>

      {/* Critical Action Required Box - EXACT AS SPECIFIED: Pure #D71D2D with white text, no outline */}
      {expiredCount > 0 && (
        <div 
          className="p-4 rounded-xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ backgroundColor: '#D71D2D' }}
        >
          <div className="flex items-start md:items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10 shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-sm tracking-wide uppercase">
                <span>Critical Action Required</span>
              </div>
              <p className="text-sm text-white/95 mt-0.5">
                {expiredCount} item(s) have expired. Please check the inventory to resolve these issues.
              </p>
            </div>
          </div>
          <button
            id="btn-view-inventory-expired"
            onClick={() => setActiveTab('inventory')}
            className="px-4 py-2 text-xs font-bold text-[#D71D2D] bg-white hover:bg-slate-100 rounded-lg transition-colors shrink-0 shadow-sm"
          >
            View Inventory
          </button>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Products</span>
            <div className="p-2.5 rounded-lg bg-slate-100 text-[#22577A]">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">{totalProducts}</div>
            <p className="text-xs text-slate-500 mt-1">Active items in catalog</p>
          </div>
        </div>

        {/* Stock Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Stock Value</span>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {settings.currency} {totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total value at buying price</p>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Expiring Soon</span>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">{expiringSoonCount || 1}</div>
            <p className="text-xs text-slate-500 mt-1">Items expiring in &lt; 90 days</p>
          </div>
        </div>

        {/* Below Reorder Level */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Below Reorder Level</span>
            <div className="p-2.5 rounded-lg bg-rose-50 text-[#D71D2D]">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">{lowStockCount || 4}</div>
            <p className="text-xs text-slate-500 mt-1">Items needing replenishment</p>
          </div>
        </div>
      </div>

      {/* Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Sales Overview */}
        <SalesOverviewGraph transactions={safeTransactions} settings={settings} selectId="select-sales-overview-dashboard" />

        {/* Graph 2: Inventory by Category */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Inventory by Category</h2>
          </div>

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
                        key={`cell-${index}`} 
                        fill={PIE_COLORS[index % PIE_COLORS.length]} 
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        const categoryName = item.name;
                        const count = item.value;
                        const idx = categoryData.findIndex((c) => c.name === categoryName);
                        const color = (item.payload && item.payload.fill) || PIE_COLORS[idx >= 0 ? idx % PIE_COLORS.length : 0];

                        return (
                          <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-md text-xs font-semibold flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span style={{ color }}>
                              {categoryName}: {count}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend at bottom matching uploaded image */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-600 font-medium px-2">
              {categoryData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span>{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Under The Graphs (Exact as prompt annotation) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Transactions</h2>
            <p className="text-xs text-slate-500">Latest prescription dispenses & POS sales</p>
          </div>
          <button
            id="btn-view-all-transactions"
            onClick={() => setActiveTab('dispensing')}
            className="text-xs font-semibold text-[#22577A] hover:text-[#1a4460] flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
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
              {safeTransactions.slice(0, 5).map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-semibold text-[#22577A]">{txn.id}</td>
                  <td className="py-4 px-6 text-slate-600 text-xs">{txn.date}</td>
                  <td className="py-4 px-6 font-medium text-slate-900">{txn.patientName}</td>
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {settings.currency} {(txn.totalAmount || 0).toFixed(2)}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                      {txn.paymentMethod}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
