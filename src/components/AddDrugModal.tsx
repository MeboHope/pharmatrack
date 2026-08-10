import React, { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import { Drug, DrugCategory, DrugFormulation, PharmacySettings } from '../types';
import { DatePicker } from './DatePicker';

interface AddDrugModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (drugData: Partial<Drug>) => void;
  editingDrug?: Drug | null;
  settings: PharmacySettings;
  nextCodeNumber: number;
}

const CATEGORIES: DrugCategory[] = [
  'Analgesics',
  'Antibiotics',
  'Antidiabetics',
  'Antihypertensives',
  'Antihistamines',
  'Antimalarials',
  'Antiretrovirals',
  'Dermatological',
  'Gastrointestinal',
  'Ophthalmic',
  'Respiratory',
  'Vitamins & Supplements',
  'Other',
];

const FORMULATIONS: DrugFormulation[] = [
  'Cream',
  'Ointment',
  'Gel',
  'Drops',
  'Inhaler',
  'Injection',
  'Powder',
  'Suppository',
  'Patch',
  'Lotion',
  'Solution',
  'Tablets',
  'Capsules',
];

export const AddDrugModal: React.FC<AddDrugModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDrug,
  settings,
  nextCodeNumber,
}) => {
  const defaultCode = `DRG-${String(nextCodeNumber).padStart(4, '0')}`;
  const defaultBatch = `BN2026-${String(nextCodeNumber).padStart(3, '0')}`;

  const [formData, setFormData] = useState({
    code: defaultCode,
    batchNo: defaultBatch,
    name: '',
    genericName: '',
    category: '' as DrugCategory | '',
    formulation: '' as DrugFormulation | '',
    manufactureDate: '',
    expiryDate: '',
    buyingPrice: 0,
    sellingPrice: 0,
    qty: 100,
    unit: 'Tablets',
    notes: '',
  });

  const [markup, setMarkup] = useState<number>(0);

  useEffect(() => {
    if (editingDrug) {
      setFormData({
        code: editingDrug.code,
        batchNo: editingDrug.batchNo,
        name: editingDrug.name,
        genericName: editingDrug.genericName,
        category: editingDrug.category,
        formulation: editingDrug.formulation,
        manufactureDate: editingDrug.manufactureDate || '',
        expiryDate: editingDrug.expiryDate,
        buyingPrice: editingDrug.buyingPrice,
        sellingPrice: editingDrug.sellingPrice,
        qty: editingDrug.qty,
        unit: editingDrug.unit || 'Tablets',
        notes: editingDrug.notes || '',
      });
      if (editingDrug.buyingPrice > 0) {
        const m = ((editingDrug.sellingPrice - editingDrug.buyingPrice) / editingDrug.buyingPrice) * 100;
        setMarkup(Number(m.toFixed(1)));
      }
    } else {
      setFormData({
        code: defaultCode,
        batchNo: defaultBatch,
        name: '',
        genericName: '',
        category: '',
        formulation: '',
        manufactureDate: '',
        expiryDate: '',
        buyingPrice: 0,
        sellingPrice: 0,
        qty: 100,
        unit: 'Tablets',
        notes: '',
      });
      setMarkup(0);
    }
  }, [editingDrug, isOpen, nextCodeNumber]);

  // Recalculate markup when price changes
  const handlePriceChange = (field: 'buyingPrice' | 'sellingPrice', val: number) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);

    if (updated.buyingPrice > 0 && updated.sellingPrice > 0) {
      const calcMarkup = ((updated.sellingPrice - updated.buyingPrice) / updated.buyingPrice) * 100;
      setMarkup(Number(calcMarkup.toFixed(1)));
    } else {
      setMarkup(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.formulation || !formData.expiryDate || formData.sellingPrice <= 0) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    // Status calculation
    const now = new Date();
    const exp = new Date(formData.expiryDate);
    let status: 'In Stock' | 'Low Stock' | 'Expired' | 'Out of Stock' = 'In Stock';

    if (exp < now) {
      status = 'Expired';
    } else if (formData.qty === 0) {
      status = 'Out of Stock';
    } else if (formData.qty <= settings.reorderAlertLevel) {
      status = 'Low Stock';
    }

    onSave({
      ...formData,
      category: formData.category as DrugCategory,
      formulation: formData.formulation as DrugFormulation,
      buyingPrice: Number(formData.buyingPrice),
      sellingPrice: Number(formData.sellingPrice),
      qty: Number(formData.qty),
      markupPercent: markup,
      status,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl my-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Header */}
        <div className="py-2.5 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 rounded-t-xl">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
              {editingDrug ? 'Update drug details in system' : 'Register a new drug into system'}
            </h2>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">
              Fields marked with <span className="text-red-500 font-bold">*</span> are required
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* DRUG IDENTITY */}
          <div className="space-y-2">
            <div className="border-b border-slate-100 pb-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drug Identity</h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Drug Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin 500mg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Generic Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amoxicillin"
                  value={formData.genericName}
                  onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as DrugCategory })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-hidden"
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Formulation <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.formulation}
                  onChange={(e) => setFormData({ ...formData, formulation: e.target.value as DrugFormulation })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-hidden"
                >
                  <option value="">Select formulation...</option>
                  {FORMULATIONS.map((form) => (
                    <option key={form} value={form}>
                      {form}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DATES */}
          <div className="space-y-2">
            <div className="border-b border-slate-100 pb-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dates</h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <DatePicker
                  label="Manufacture Date"
                  size="sm"
                  value={formData.manufactureDate || ''}
                  onChange={(val) => setFormData({ ...formData, manufactureDate: val })}
                  quickPresetType="manufacture"
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div>
                <DatePicker
                  label="Expiry Date"
                  size="sm"
                  required
                  value={formData.expiryDate}
                  onChange={(val) => setFormData({ ...formData, expiryDate: val })}
                  quickPresetType="expiry"
                  position="top"
                  align="right"
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>
          </div>

          {/* PRICING & STOCK */}
          <div className="space-y-2">
            <div className="border-b border-slate-100 pb-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pricing & Stock ({settings.currency})</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Buying Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.buyingPrice}
                  onChange={(e) => handlePriceChange('buyingPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Selling Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.sellingPrice}
                  onChange={(e) => handlePriceChange('sellingPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-hidden font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5 flex items-center gap-0.5 truncate">
                  <Calculator className="w-3 h-3 text-slate-400 shrink-0" /> Markup %
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${markup}%`}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Stock Qty
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* NOTES */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
              Notes (optional)
            </label>
            <input
              type="text"
              placeholder="Any special notes about this drug..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-[#22577A] focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-drug"
              className="px-5 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              style={{ backgroundColor: '#0d8065' }}
            >
              {editingDrug ? 'Save Changes' : '+ Add Drug'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
