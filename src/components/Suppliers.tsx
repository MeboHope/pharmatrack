import React, { useState } from 'react';
import { Pencil, Plus, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { Supplier } from '../types';

interface SuppliersProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier?: (supplier: Supplier) => void;
}

export const Suppliers: React.FC<SuppliersProps> = ({ suppliers, onAddSupplier, onUpdateSupplier }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    leadTimeDays: 2,
  });

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', leadTimeDays: 2 });
    setShowModal(true);
  };

  const handleOpenEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      leadTimeDays: sup.leadTimeDays || 2,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    if (editingSupplier) {
      const updated: Supplier = {
        ...editingSupplier,
        ...formData,
      };
      if (onUpdateSupplier) {
        onUpdateSupplier(updated);
      }
    } else {
      onAddSupplier({
        id: `SUP-${String(suppliers.length + 1).padStart(3, '0')}`,
        ...formData,
      });
    }

    setShowModal(false);
    setEditingSupplier(null);
    setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', leadTimeDays: 2 });
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Suppliers Directory</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage pharmaceutical vendors, procurement lead times, and contact details
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
          style={{ backgroundColor: '#0d8065' }}
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((sup) => (
          <div key={sup.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{sup.name}</h3>
                <span className="text-xs text-[#22577A] font-semibold">{sup.id}</span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenEditModal(sup)}
                className="px-3 py-1.5 text-xs font-semibold text-[#22577A] bg-sky-50 hover:bg-[#22577A] hover:text-white rounded-lg transition-colors flex items-center gap-1.5 border border-sky-100 shadow-xs cursor-pointer"
                title="Edit Supplier"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Contact Person:</span> {sup.contactPerson}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {sup.phone}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {sup.email}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {sup.address}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Lead time:
              </span>
              <span className="font-bold text-[#22577A] bg-slate-100 px-2 py-0.5 rounded-md">
                {sup.leadTimeDays} Days
              </span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editingSupplier ? `Edit Supplier (${editingSupplier.id})` : 'Add Supplier'}
              </h2>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                Fields marked with <span className="text-red-500 font-bold">*</span> are required
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:border-[#22577A] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Contact Person</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:border-[#22577A] focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Phone <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:border-[#22577A] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:border-[#22577A] focus:outline-hidden"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:border-[#22577A] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:border-[#22577A] focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSupplier(null);
                  }}
                  className="px-4 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white rounded-lg hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: '#0d8065' }}
                >
                  {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
