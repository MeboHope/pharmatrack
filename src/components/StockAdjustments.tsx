import React, { useState } from 'react';
import { SlidersHorizontal, Plus, AlertTriangle, FileText } from 'lucide-react';
import { Drug, StockAdjustment, PharmacySettings } from '../types';

interface StockAdjustmentsProps {
  drugs: Drug[];
  adjustments: StockAdjustment[];
  settings: PharmacySettings;
  onAddAdjustment: (adj: StockAdjustment) => void;
}

export const StockAdjustments: React.FC<StockAdjustmentsProps> = ({
  drugs,
  adjustments,
  settings,
  onAddAdjustment,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedDrugId, setSelectedDrugId] = useState('');
  const [adjustedQty, setAdjustedQty] = useState<number>(0);
  const [adjType, setAdjType] = useState<StockAdjustment['type']>('Expiry Removal');
  const [reason, setReason] = useState('');

  const selectedDrug = drugs.find((d) => d.id === selectedDrugId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrug || adjustedQty < 0 || !reason) {
      alert('Please fill out all fields.');
      return;
    }

    onAddAdjustment({
      id: `ADJ-${String(adjustments.length + 1).padStart(3, '0')}`,
      date: new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      drugId: selectedDrug.id,
      drugName: selectedDrug.name,
      batchNo: selectedDrug.batchNo,
      previousQty: selectedDrug.qty,
      adjustedQty,
      type: adjType,
      reason,
      adjustedBy: settings.clinicianName || 'Pharmacist',
    });

    setShowModal(false);
    setSelectedDrugId('');
    setAdjustedQty(0);
    setReason('');
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Adjustments & Audit Logs</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Reconcile inventory count, log damaged stock, or quarantine expired batches
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs flex items-center gap-1.5"
          style={{ backgroundColor: '#0d8065' }}
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Record Adjustment
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-3.5 whitespace-nowrap">Log ID</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Date & Time</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Drug Item</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Batch No</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Prev Qty → New Qty</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Adjustment Type</th>
                <th className="py-3 px-3.5">Reason Note</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Adjusted By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {adjustments.map((adj) => (
                <tr key={adj.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3.5 font-bold text-[#22577A] text-xs whitespace-nowrap">{adj.id}</td>
                  <td className="py-3 px-3.5 text-xs text-slate-500 whitespace-nowrap">{adj.date}</td>
                  <td className="py-3 px-3.5 font-bold text-slate-900 text-xs whitespace-nowrap">{adj.drugName}</td>
                  <td className="py-3 px-3.5 text-xs text-slate-600 whitespace-nowrap">{adj.batchNo}</td>
                  <td className="py-3 px-3.5 text-xs font-bold whitespace-nowrap">
                    <span className="text-slate-400">{adj.previousQty}</span>
                    <span className="mx-1.5 text-slate-400">→</span>
                    <span className="text-emerald-700">{adj.adjustedQty}</span>
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      {adj.type}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-xs text-slate-600 max-w-xs truncate">{adj.reason}</td>
                  <td className="py-3 px-3.5 text-xs text-slate-500 whitespace-nowrap">{adj.adjustedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Record Stock Adjustment</h2>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                Fields marked with <span className="text-red-500 font-bold">*</span> are required
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Select Drug Item <span className="text-red-500">*</span></label>
                <select
                  required
                  value={selectedDrugId}
                  onChange={(e) => {
                    setSelectedDrugId(e.target.value);
                    const d = drugs.find((item) => item.id === e.target.value);
                    if (d) setAdjustedQty(d.qty);
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                >
                  <option value="">Select drug to adjust...</option>
                  {drugs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code}) - Current Stock: {d.qty}
                    </option>
                  ))}
                </select>
              </div>

              {selectedDrug && (
                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                  <div><strong>Batch:</strong> {selectedDrug.batchNo}</div>
                  <div><strong>Current Stock Qty:</strong> {selectedDrug.qty} {selectedDrug.unit}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">New Adjusted Qty <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustedQty}
                  onChange={(e) => setAdjustedQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Adjustment Type <span className="text-red-500">*</span></label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                >
                  <option value="Expiry Removal">Expiry Removal</option>
                  <option value="Loss / Damage">Loss / Damage</option>
                  <option value="Audit Reconciliation">Audit Reconciliation</option>
                  <option value="Return to Supplier">Return to Supplier</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Reason / Notes <span className="text-red-500">*</span></label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain why stock count was adjusted..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-medium bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white rounded-lg" style={{ backgroundColor: '#0d8065' }}>
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
