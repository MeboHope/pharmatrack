import React from 'react';
import { Upload, TrendingUp, AlertTriangle, PackageCheck } from 'lucide-react';
import { Drug, DispenseTransaction, PharmacySettings } from '../types';
import { exportToExcel } from '../utils/exportExcel';
import { SalesOverviewGraph } from './SalesOverviewGraph';

interface ReportsProps {
  drugs: Drug[];
  transactions: DispenseTransaction[];
  settings: PharmacySettings;
}

export const Reports: React.FC<ReportsProps> = ({ drugs = [], transactions = [], settings }) => {
  const totalSalesVolume = (transactions || []).reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  const totalItemsSold = (transactions || []).reduce((acc, t) => acc + (t.items || []).reduce((sum, i) => sum + (i.qty || 0), 0), 0);
  const expiredDrugs = (drugs || []).filter((d) => d.status === 'Expired');
  const lowStockDrugs = (drugs || []).filter((d) => d.status === 'Low Stock');

  const handleExportSalesReport = () => {
    const reportData = (transactions || []).map((t) => ({
      'Transaction ID': t.id,
      'Date & Time': t.date,
      'Patient Name': t.patientName,
      'Patient Type': t.patientType,
      'Payment Method': t.paymentMethod,
      'M-Pesa / Cash Info': t.mpesaCode || (t.cashTendered ? `Tendered: ${t.cashTendered}` : '-'),
      'Clinician': t.clinicianName,
      'Item Count': (t.items || []).length,
      'Subtotal': t.subtotal,
      'Discount': t.discount,
      'Total Amount': t.totalAmount,
    }));

    exportToExcel(
      reportData,
      `PharmaTrack_Sales_Report_${new Date().toISOString().slice(0, 10)}`,
      'Sales Report'
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Export operational summaries, sales figures, and inventory audit reports
          </p>
        </div>
        <button
          onClick={handleExportSalesReport}
          className="px-4 py-2 text-xs font-bold text-white bg-[#22577A] hover:bg-[#194360] rounded-lg shadow-xs flex items-center gap-2"
        >
          <Upload className="w-4 h-4" /> Export to Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Gross Sales Volume</span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {settings.currency} {totalSalesVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500">Across {transactions.length} total transactions</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Expired Items Quarantined</span>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{expiredDrugs.length}</div>
          <p className="text-xs text-slate-500">Requires stock adjustment disposal</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Total Units Dispensed</span>
            <PackageCheck className="w-5 h-5 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalItemsSold}</div>
          <p className="text-xs text-slate-500">Total dosage units sold</p>
        </div>
      </div>

      {/* Sales Overview Graph Duplicated from Dashboard */}
      <SalesOverviewGraph 
        transactions={transactions} 
        settings={settings} 
        selectId="select-sales-overview-reports" 
      />
    </div>
  );
};
