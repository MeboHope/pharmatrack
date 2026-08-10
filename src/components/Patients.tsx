import React, { useState } from 'react';
import { Users, Plus, Phone, Mail, AlertCircle, Calendar, Pencil } from 'lucide-react';
import { PatientRecord } from '../types';

interface PatientsProps {
  patients: PatientRecord[];
  onAddPatient: (patient: PatientRecord) => void;
  onUpdatePatient?: (patient: PatientRecord) => void;
}

export const Patients: React.FC<PatientsProps> = ({ patients, onAddPatient, onUpdatePatient }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    age: 30,
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    address: '',
    allergies: 'None',
  });

  const handleOpenAddModal = () => {
    setEditingPatient(null);
    setFormData({ name: '', phone: '', email: '', age: 30, gender: 'Male', address: '', allergies: 'None' });
    setShowModal(true);
  };

  const handleOpenEditModal = (pat: PatientRecord) => {
    setEditingPatient(pat);
    setFormData({
      name: pat.name,
      phone: pat.phone || '',
      email: pat.email || '',
      age: pat.age || 30,
      gender: pat.gender || 'Male',
      address: pat.address || '',
      allergies: pat.allergies || 'None',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingPatient) {
      const updated: PatientRecord = {
        ...editingPatient,
        ...formData,
      };
      if (onUpdatePatient) {
        onUpdatePatient(updated);
      }
    } else {
      onAddPatient({
        id: `PAT-${String(patients.length + 1).padStart(3, '0')}`,
        ...formData,
        totalVisits: 1,
        createdAt: new Date().toISOString().slice(0, 10),
      });
    }

    setShowModal(false);
    setEditingPatient(null);
    setFormData({ name: '', phone: '', email: '', age: 30, gender: 'Male', address: '', allergies: 'None' });
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patients Directory</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Registered patient medical profiles, allergies, and visit histories
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
          style={{ backgroundColor: '#0d8065' }}
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Add Patient
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Patient ID</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Age / Gender</th>
                <th className="py-3.5 px-4">Known Allergies</th>
                <th className="py-3.5 px-4">Total Visits</th>
                <th className="py-3.5 px-4">Registered Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {patients.map((pat) => (
                <tr key={pat.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#22577A]">{pat.id}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{pat.name}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">{pat.phone}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {pat.age} yrs • {pat.gender}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {pat.allergies && pat.allergies !== 'None' ? (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md flex items-center gap-1 w-fit">
                        <AlertCircle className="w-3 h-3" /> {pat.allergies}
                      </span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{pat.totalVisits}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">{pat.createdAt}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(pat)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#22577A] bg-sky-50 hover:bg-[#22577A] hover:text-white rounded-lg transition-colors inline-flex items-center gap-1 border border-sky-100 shadow-xs cursor-pointer"
                      title="Edit Patient"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </td>
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
              <h2 className="text-lg font-bold text-slate-900">
                {editingPatient ? `Edit Patient (${editingPatient.id})` : 'Register New Patient'}
              </h2>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                Fields marked with <span className="text-red-500 font-bold">*</span> are required
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Patient Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  <label className="block text-xs font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:border-[#22577A] focus:outline-hidden"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:border-[#22577A] focus:outline-hidden"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Allergies</label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Aspirin"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
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
                    setEditingPatient(null);
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
                  {editingPatient ? 'Update Patient' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
